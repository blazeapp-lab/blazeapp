import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface QuotePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotedPost: {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    profiles: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId: string;
  onQuotePosted: () => void;
}

const QuotePostDialog = ({ open, onOpenChange, quotedPost, currentUserId, onQuotePosted }: QuotePostDialogProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please add your thoughts");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: currentUserId,
        content: content.trim(),
        quoted_post_id: quotedPost.id,
      });

      if (error) throw error;

      toast.success("Quote post created!");
      setContent("");
      onOpenChange(false);
      onQuotePosted();
    } catch (error: any) {
      toast.error("Failed to create quote post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Quote Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Add your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={loading}
          />
          
          {/* Preview of quoted post */}
          <Card className="p-3 bg-secondary/50 border-2">
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={quotedPost.profiles.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {quotedPost.profiles.display_name || quotedPost.profiles.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    @{quotedPost.profiles.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {formatDistanceToNow(new Date(quotedPost.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 line-clamp-3">{quotedPost.content}</p>
                {quotedPost.image_url && (
                  <img
                    src={quotedPost.image_url}
                    alt="Quoted post media"
                    className="mt-2 rounded max-h-32 w-full object-cover"
                  />
                )}
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Posting..." : "Quote Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotePostDialog;
