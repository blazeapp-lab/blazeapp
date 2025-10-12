import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Image } from "lucide-react";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().trim().min(1, { message: "Post content cannot be empty" }).max(5000, { message: "Post is too long (max 5000 characters)" }),
  imageUrl: z.string().trim().url({ message: "Invalid image URL" }).max(2000, { message: "URL too long" }).optional().or(z.literal("")),
});

interface CreatePostProps {
  userId: string;
  onPostCreated: () => void;
}

const CreatePost = ({ userId, onPostCreated }: CreatePostProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const validatedData = postSchema.parse({ content, imageUrl });
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: validatedData.content,
        image_url: validatedData.imageUrl || null,
      });

      if (error) throw error;

      toast.success("Post created successfully!");
      setContent("");
      setImageUrl("");
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Image URL (optional)</span>
            </div>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
              disabled={loading}
            />
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
