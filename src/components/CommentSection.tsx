import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Loader2, User, Heart } from "lucide-react";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().trim().min(1, { message: "Comment cannot be empty" }).max(2000, { message: "Comment is too long (max 2000 characters)" }),
});

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  parent_comment_id: string | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
}

const CommentSection = ({ postId, currentUserId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
    fetchLikedComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        likes_count,
        parent_comment_id,
        profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load comments");
      return;
    }
    setComments(data || []);
  };

  const fetchLikedComments = async () => {
    const { data } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", currentUserId);
    
    if (data) {
      setLikedComments(new Set(data.map(like => like.comment_id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const validatedData = commentSchema.parse({ content: newComment });
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: currentUserId,
        content: validatedData.content,
        parent_comment_id: replyingTo,
      });

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      await fetchComments();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to post comment");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const isLiked = likedComments.has(commentId);
    
    try {
      if (isLiked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);
        
        setLikedComments(prev => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      } else {
        await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: currentUserId,
        });
        
        setLikedComments(prev => new Set(prev).add(commentId));
      }
      await fetchComments();
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_comment_id === parentId);

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const replies = getReplies(comment.id);
    const isLiked = likedComments.has(comment.id);

    return (
      <div className={`space-y-2 ${isReply ? 'ml-10' : ''}`}>
        <div className="flex gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {comment.profiles.display_name || comment.profiles.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm mt-1">{comment.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => handleLikeComment(comment.id)}
              >
                <Heart className={`h-3 w-3 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                <span>{comment.likes_count}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReplyingTo(comment.id)}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
        {replies.length > 0 && (
          <div className="space-y-2">
            {replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <span>Replying to comment</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          )}
          <Textarea
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] resize-none"
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !newComment.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </Button>
      </form>

      <div className="space-y-3">
        {topLevelComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};

export default CommentSection;
