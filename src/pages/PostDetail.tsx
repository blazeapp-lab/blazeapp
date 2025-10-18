import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, User, Repeat2, Eye, ThumbsDown, ArrowLeft, Share2, Trash2, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "@/components/CommentSection";
import { toast } from "sonner";
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

interface PostDetailProps {
  currentUserId: string | undefined;
}

const PostDetail = ({ currentUserId }: PostDetailProps) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBrokenHearted, setIsBrokenHearted] = useState(false);
  const [brokenHeartsCount, setBrokenHeartsCount] = useState(0);
  const [isReposted, setIsReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      trackView();
    }
  }, [postId, currentUserId]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_private
          )
        `)
        .eq("id", postId)
        .single();

      if (error) throw error;
      
      // Check if user has blocked or been blocked by post author
      if (currentUserId && currentUserId !== data.user_id) {
        const { data: blockedData } = await supabase
          .from("blocks")
          .select("id")
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", data.user_id)
          .maybeSingle();
        
        const { data: blockerData } = await supabase
          .from("blocks")
          .select("id")
          .eq("blocker_id", data.user_id)
          .eq("blocked_id", currentUserId)
          .maybeSingle();
        
        if (blockedData || blockerData) {
          toast.error("Cannot view this post");
          navigate("/");
          return;
        }
      }
      
      // Check if user can view this post (if account is private)
      if (data.profiles.is_private && currentUserId !== data.user_id) {
        // Check if current user is following the post author
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUserId)
          .eq("following_id", data.user_id)
          .maybeSingle();
        
        if (!followData) {
          toast.error("This account is private");
          navigate("/");
          return;
        }
      }
      
      setPost(data);
      setLikesCount(data.likes_count);
      setBrokenHeartsCount(data.broken_hearts_count);
      setRepostsCount(data.reposts_count);
      setViewsCount(data.views_count);
      setEditContent(data.content);

      if (currentUserId) {
        checkIfLiked();
        checkIfBrokenHearted();
        checkIfReposted();
      }
    } catch (error: any) {
      toast.error("Failed to load post");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (!currentUserId || !postId) return;
    
    try {
      await supabase.from("post_views").insert({
        post_id: postId,
        user_id: currentUserId,
      });
    } catch (error) {
      // Ignore duplicate view errors
    }
  };

  const checkIfLiked = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const checkIfBrokenHearted = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("broken_hearts")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setIsBrokenHearted(!!data);
  };

  const checkIfReposted = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("reposts")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setIsReposted(!!data);
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
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        setLikesCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        if (isBrokenHearted) {
          await supabase
            .from("broken_hearts")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", currentUserId);
          setBrokenHeartsCount((prev) => prev - 1);
          setIsBrokenHearted(false);
        }
        
        await supabase.from("likes").insert({
          post_id: postId,
          user_id: currentUserId,
        });
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error: any) {
      toast.error("Failed to update like");
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
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        setBrokenHeartsCount((prev) => prev - 1);
        setIsBrokenHearted(false);
      } else {
        if (isLiked) {
          await supabase
            .from("likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", currentUserId);
          setLikesCount((prev) => prev - 1);
          setIsLiked(false);
        }
        
        await supabase.from("broken_hearts").insert({
          post_id: postId,
          user_id: currentUserId,
        });
        setBrokenHeartsCount((prev) => prev + 1);
        setIsBrokenHearted(true);
      }
    } catch (error: any) {
      toast.error("Failed to update reaction");
    }
  };

  const handleRepost = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to repost");
      navigate("/auth");
      return;
    }
    try {
      if (isReposted) {
        await supabase
          .from("reposts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        setRepostsCount((prev) => prev - 1);
        setIsReposted(false);
        toast.success("Repost removed");
      } else {
        await supabase.from("reposts").insert({
          post_id: postId,
          user_id: currentUserId,
        });
        setRepostsCount((prev) => prev + 1);
        setIsReposted(true);
        toast.success("Reposted!");
      }
    } catch (error: any) {
      toast.error("Failed to repost");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast.success("Post deleted successfully");
      navigate("/");
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
        .eq("id", postId);

      if (error) throw error;

      toast.success("Post updated successfully");
      setShowEditDialog(false);
      fetchPost();
    } catch (error: any) {
      toast.error("Failed to update post");
    } finally {
      setIsEditing(false);
    }
  };

  if (loading || !post) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading post...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar 
            className="h-12 w-12 cursor-pointer" 
            onClick={() => navigate(`/profile/${post.profiles.id}`)}
          >
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="font-semibold text-lg hover:underline cursor-pointer"
                  onClick={() => navigate(`/profile/${post.profiles.id}`)}
                >
                  {post.profiles.display_name || post.profiles.username}
                </span>
                <span className="text-muted-foreground">
                  @{post.profiles.username}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {currentUserId === post.user_id && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditDialog(true)}
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
                  </>
                )}
              </div>
            </div>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            <p className="mt-3 text-lg whitespace-pre-wrap break-words">{post.content}</p>
            {post.image_url && (
              <>
                {post.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                  <video
                    src={post.image_url}
                    controls
                    className="mt-4 rounded-lg w-full"
                  />
                ) : (
                  <img
                    src={post.image_url}
                    alt="Post media"
                    className="mt-4 rounded-lg w-full object-contain max-h-[500px]"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 pt-4 border-t">
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
            onClick={handleRepost}
          >
            <Repeat2
              className={`h-5 w-5 ${isReposted ? "fill-green-500 text-green-500" : ""}`}
            />
            <span>{repostsCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments_count}</span>
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Eye className="h-5 w-5" />
            <span>{viewsCount}</span>
          </div>
        </div>

        {currentUserId && (
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
    </div>
  );
};

export default PostDetail;
