import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().trim().min(1, { message: "Post content cannot be empty" }).max(5000, { message: "Post is too long (max 5000 characters)" }),
});

const validateMediaFile = async (file: File): Promise<boolean> => {
  const validTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];
  
  if (!validTypes.includes(file.type)) {
    return false;
  }
  
  // Check file signature for images
  if (file.type.startsWith('image/')) {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const signatures = {
      'ffd8ff': 'jpeg',
      '89504e47': 'png',
      '47494638': 'gif',
      '52494646': 'webp',
    };
    
    return Object.keys(signatures).some(sig => hex.startsWith(sig));
  }
  
  return true; // For videos, rely on MIME type
};

interface CreatePostProps {
  userId: string;
  onPostCreated: () => void;
}

const CreatePost = ({ userId, onPostCreated }: CreatePostProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (50MB limit)
    if (file.size > 52428800) {
      toast.error("File must be less than 50MB");
      return;
    }

    const isValid = await validateMediaFile(file);
    if (!isValid) {
      toast.error("Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV).");
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const uploadMedia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const validatedData = postSchema.parse({ content });
      
      let mediaUrl = null;
      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile);
      }

      const { data: newPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: validatedData.content,
          image_url: mediaUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Extract @username mentions from content
      const mentionRegex = /@(\w+)/g;
      const mentions = [...validatedData.content.matchAll(mentionRegex)];
      const taggedUsernames = [...new Set(mentions.map(match => match[1]))];

      // Notify tagged users
      if (taggedUsernames.length > 0 && newPost) {
        await supabase.rpc("notify_tagged_users", {
          post_id_param: newPost.id,
          tagged_usernames: taggedUsernames,
        });
      }

      toast.success("Post created successfully!");
      setContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setOpen(false);
      onPostCreated();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create post");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button id="create-post-trigger" className="hidden" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={loading}
          />
          
          {mediaPreview && (
            <div className="relative">
              {mediaFile?.type.startsWith('video/') ? (
                <video 
                  src={mediaPreview} 
                  controls 
                  className="w-full rounded-lg max-h-96"
                />
              ) : (
                <img 
                  src={mediaPreview} 
                  alt="Preview" 
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeMedia}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleMediaChange}
              className="hidden"
              id="media-upload"
              disabled={loading}
            />
            <label htmlFor="media-upload">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={loading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {mediaFile ? 'Change Media' : 'Upload Photo/Video/GIF'}
                </span>
              </Button>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
