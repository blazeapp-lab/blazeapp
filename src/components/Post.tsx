import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, User, Trash2, Edit, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "./CommentSection";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PostProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    comments_count: number;
    broken_hearts_count: number;
    created_at: string;
    user_id: string;
    profiles: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId: string | undefined;
  onPostDeleted?: () => void;
}

const Post = ({ post, currentUserId, onPostDeleted }: PostProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isBrokenHearted, setIsBrokenHearted] = useState(false);
  const [brokenHeartsCount, setBrokenHeartsCount] = useState(post.broken_hearts_count);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      checkIfLiked();
      checkIfBrokenHearted();
    }
  }, [post.id, currentUserId]);

  const checkIfLiked = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const checkIfBrokenHearted = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("broken_hearts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setIsBrokenHearted(!!data);
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to like posts");
      navigate("/auth");
      return;
    }
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
        // If user has disliked, remove the dislike first
        if (isBrokenHearted) {
          await supabase
            .from("broken_hearts")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", currentUserId);
          setBrokenHeartsCount((prev) => prev - 1);
          setIsBrokenHearted(false);
        }
        
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

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      setShowDeleteDialog(false);
      onPostDeleted?.();
    } catch (error: any) {
      toast.error("Failed to delete post");
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Post content cannot be empty");
      return;
    }

    setIsEditing(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ content: editContent })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post updated successfully");
      setShowEditDialog(false);
      onPostDeleted?.(); // Refresh the posts
    } catch (error: any) {
      toast.error("Failed to update post");
    } finally {
      setIsEditing(false);
    }
  };

  const handleBrokenHeart = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to react to posts");
      navigate("/auth");
      return;
    }
    try {
      if (isBrokenHearted) {
        await supabase
          .from("broken_hearts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setBrokenHeartsCount((prev) => prev - 1);
        setIsBrokenHearted(false);
      } else {
        // If user has liked, remove the like first
        if (isLiked) {
          await supabase
            .from("likes")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", currentUserId);
          setLikesCount((prev) => prev - 1);
          setIsLiked(false);
        }
        
        await supabase.from("broken_hearts").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        setBrokenHeartsCount((prev) => prev + 1);
        setIsBrokenHearted(true);
      }
    } catch (error: any) {
      toast.error("Failed to update reaction");
    }
  };

  const handleCommentClick = () => {
    if (!currentUserId) {
      toast.error("Please sign in to comment");
      navigate("/auth");
      return;
    }
    setShowComments(!showComments);
  };

  const handlePostClick = (e: React.MouseEvent) => {
    // Don't toggle comments if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('img') ||
      target.closest('video')
    ) {
      return;
    }
    handleCommentClick();
  };

  return (
    <>
      <Card 
        className="p-4 space-y-3 hover:bg-secondary/50 transition-colors cursor-pointer" 
        onClick={handlePostClick}
      >
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
              {currentUserId === post.user_id && (
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditContent(post.content);
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words">{post.content}</p>
            {post.image_url && (
              <>
                {post.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                  <video
                    src={post.image_url}
                    controls
                    className="mt-3 rounded-lg max-h-96 w-full"
                  />
                ) : (
                  <img
                    src={post.image_url}
                    alt="Post media"
                    className="mt-3 rounded-lg max-h-96 w-full object-cover"
                  />
                )}
              </>
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
            onClick={handleBrokenHeart}
          >
            <ThumbsDown
              className={`h-5 w-5 ${isBrokenHearted ? "fill-blue-500 text-blue-500" : ""}`}
            />
            <span>{brokenHeartsCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={handleCommentClick}
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments_count}</span>
          </Button>
        </div>

        {showComments && currentUserId && (
          <CommentSection postId={post.id} currentUserId={currentUserId} />
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={isEditing}>
                {isEditing ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Post;
