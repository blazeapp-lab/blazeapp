import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "./CommentSection";
import { useNavigate } from "react-router-dom";

interface PostProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    comments_count: number;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId: string;
}

const Post = ({ post, currentUserId }: PostProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    checkIfLiked();
  }, [post.id, currentUserId]);

  const checkIfLiked = async () => {
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .single();
    setIsLiked(!!data);
  };

  const handleLike = async () => {
    try {
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setLikesCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        await supabase.from("likes").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  return (
    <Card className="p-4 space-y-3 hover:bg-secondary/50 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar 
          className="cursor-pointer" 
          onClick={() => navigate(`/profile/${post.profiles.id}`)}
        >
          <AvatarImage src={post.profiles.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className="font-semibold hover:underline cursor-pointer"
              onClick={() => navigate(`/profile/${post.profiles.id}`)}
            >
              {post.profiles.display_name || post.profiles.username}
            </span>
            <span className="text-sm text-muted-foreground">
              @{post.profiles.username}
            </span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words">{post.content}</p>
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post image"
              className="mt-3 rounded-lg max-h-96 w-full object-cover"
            />
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleLike}
        >
          <Heart
            className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
          />
          <span>{likesCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.comments_count}</span>
        </Button>
      </div>

      {showComments && (
        <CommentSection postId={post.id} currentUserId={currentUserId} />
      )}
    </Card>
  );
};

export default Post;
