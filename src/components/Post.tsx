import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, User, Trash2, Edit, ThumbsDown, Repeat2, Share2, Pin, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "./CommentSection";
import { useNavigate } from "react-router-dom";
import { parseMentions } from "@/lib/mentionUtils";
import { formatNumber } from "@/lib/utils";
import { emitPostUpdate } from "@/lib/postEvents";
import { ReportDialog } from "./ReportDialog";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

interface PostProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    comments_count: number;
    broken_hearts_count: number;
    reposts_count: number;
    views_count: number;
    created_at: string;
    updated_at: string;
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
  showPinButton?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
}

const Post = ({ post, currentUserId, onPostDeleted, showPinButton = false, isPinned = false, onPin }: PostProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isBrokenHearted, setIsBrokenHearted] = useState(false);
  const [brokenHeartsCount, setBrokenHeartsCount] = useState(post.broken_hearts_count);
  const [isReposted, setIsReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [viewsCount, setViewsCount] = useState(post.views_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBrokenHearting, setIsBrokenHearting] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    // Sync counters with prop values
    setLikesCount(post.likes_count);
    setBrokenHeartsCount(post.broken_hearts_count);
    setRepostsCount(post.reposts_count);
    setViewsCount(post.views_count);
    setCommentsCount(post.comments_count);

    if (currentUserId) {
      checkIfLiked();
      checkIfBrokenHearted();
      checkIfReposted();
    }
  }, [post.id, post.likes_count, post.broken_hearts_count, post.reposts_count, post.views_count, currentUserId]);

  // Listen for counter updates from PostDetail or other Post components
  useEffect(() => {
    const handlePostUpdate = (e: CustomEvent<any>) => {
      if (e.detail.postId === post.id) {
        if (e.detail.likes_count !== undefined) {
          setLikesCount(e.detail.likes_count);
        }
        if (e.detail.broken_hearts_count !== undefined) {
          setBrokenHeartsCount(e.detail.broken_hearts_count);
        }
        if (e.detail.reposts_count !== undefined) {
          setRepostsCount(e.detail.reposts_count);
        }
        if (e.detail.comments_count !== undefined) {
          setCommentsCount(e.detail.comments_count);
        }
      }
    };

    window.addEventListener("blaze:update-post", handlePostUpdate as EventListener);
    return () => window.removeEventListener("blaze:update-post", handlePostUpdate as EventListener);
  }, [post.id]);

  const trackView = async (): Promise<void> => {
    try {
      const { error } = await supabase.from("post_views").insert({
        post_id: post.id,
        user_id: currentUserId || null,
      });

      if (error) throw error;

      setViewsCount((prev) => prev + 1);
    } catch {
      // Ignore duplicate view errors silently
    }
  };

  const checkIfLiked = async (): Promise<void> => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Error checking like status:", error.message);
      return;
    }

    setIsLiked(!!data);
  };

  const checkIfBrokenHearted = async (): Promise<void> => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("broken_hearts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Error checking broken heart status:", error.message);
      return;
    }

    setIsBrokenHearted(!!data);
  };

  const checkIfReposted = async (): Promise<void> => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("reposts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Error checking repost status:", error.message);
      return;
    }

    setIsReposted(!!data);
  };

  const handleLike = async (): Promise<void> => {
    if (!currentUserId) {
      toast.error("Please sign in to like posts");
      navigate("/auth");
      return;
    }

    if (isLiking) return; // Prevent spam clicking
    setIsLiking(true);

    const previousLikeState = isLiked;
    const previousCount = likesCount;

    try {
      if (isLiked) {
        // Optimistic update
        setIsLiked(false);
        const newCount = Math.max(0, likesCount - 1);
        setLikesCount(newCount);

        const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);

        if (error) throw error;

        emitPostUpdate({ postId: post.id, likes_count: newCount });
      } else {
        // Remove dislike first if needed
        if (isBrokenHearted) {
          const { error: bhError } = await supabase
            .from("broken_hearts")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", currentUserId);

          if (!bhError) {
            setIsBrokenHearted(false);
            const newBhCount = Math.max(0, brokenHeartsCount - 1);
            setBrokenHeartsCount(newBhCount);
            emitPostUpdate({ postId: post.id, broken_hearts_count: newBhCount });
          }
        }

        // Optimistic like
        setIsLiked(true);
        const newCount = likesCount + 1;
        setLikesCount(newCount);

        const { error } = await supabase.from("likes").insert({
          post_id: post.id,
          user_id: currentUserId,
        });

        if (error) throw error;

        emitPostUpdate({ postId: post.id, likes_count: newCount });
      }

      // Trigger feed refresh
      sessionStorage.setItem("blaze:refresh-feed", "1");
      window.dispatchEvent(new Event("blaze:refresh-feed"));
    } catch (error) {
      console.error("Like update failed:", error);
      // Rollback optimistic update
      setIsLiked(previousLikeState);
      setLikesCount(previousCount);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      sessionStorage.setItem("blaze:refresh-feed", "1");
      window.dispatchEvent(new Event("blaze:refresh-feed"));
      setShowDeleteDialog(false);
      onPostDeleted?.();
    } catch (error: any) {
      toast.error("Failed to delete post");
    }
  };

  const handleEdit = async () => {
    const trimmedContent = editContent.trim();

    // Content validation
    if (!trimmedContent) {
      toast.error("Post content cannot be empty");
      return;
    }

    // Prevent extremely long posts (max 5000 chars)
    if (trimmedContent.length > 5000) {
      toast.error("Post content is too long (max 5000 characters)");
      return;
    }

    setIsEditing(true);
    try {
      // CRITICAL: Only update content field - all other fields are protected by database triggers
      const { error } = await supabase
        .from("posts")
        .update({ content: trimmedContent })
        .eq("id", post.id)
        .eq("user_id", currentUserId); // Extra security: verify ownership

      if (error) throw error;

      toast.success("Post updated successfully");
      setShowEditDialog(false);
      onPostDeleted?.(); // Refresh the posts
      sessionStorage.setItem("blaze:refresh-feed", "1");
      window.dispatchEvent(new Event("blaze:refresh-feed"));
    } catch (error: any) {
      console.error("Edit error:", error);
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
    if (isBrokenHearting) return; // Prevent spam clicking
    setIsBrokenHearting(true);

    const previousState = isBrokenHearted;
    const previousCount = brokenHeartsCount;

    try {
      if (isBrokenHearted) {
        // Optimistic update
        setIsBrokenHearted(false);
        const newCount = Math.max(0, brokenHeartsCount - 1);
        setBrokenHeartsCount(newCount);

        const { error } = await supabase
          .from("broken_hearts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        emitPostUpdate({ postId: post.id, broken_hearts_count: newCount });
        sessionStorage.setItem("blaze:refresh-feed", "1");
        window.dispatchEvent(new Event("blaze:refresh-feed"));
      } else {
        // If user has liked, remove the like first
        if (isLiked) {
          await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
          setIsLiked(false);
          const newLikeCount = Math.max(0, likesCount - 1);
          setLikesCount(newLikeCount);
          emitPostUpdate({ postId: post.id, likes_count: newLikeCount });
        }

        // Optimistic update
        setIsBrokenHearted(true);
        const newCount = brokenHeartsCount + 1;
        setBrokenHeartsCount(newCount);

        const { error } = await supabase.from("broken_hearts").insert({
          post_id: post.id,
          user_id: currentUserId,
        });

        if (error) throw error;

        emitPostUpdate({ postId: post.id, broken_hearts_count: newCount });
        sessionStorage.setItem("blaze:refresh-feed", "1");
        window.dispatchEvent(new Event("blaze:refresh-feed"));
      }
    } catch (error: any) {
      // Rollback on error
      setIsBrokenHearted(previousState);
      setBrokenHeartsCount(previousCount);
      toast.error("Failed to update reaction");
    } finally {
      setIsBrokenHearting(false);
    }
  };

  const handleRepost = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to repost");
      navigate("/auth");
      return;
    }
    if (isReposting) return; // Prevent spam clicking
    setIsReposting(true);

    const previousState = isReposted;
    const previousCount = repostsCount;

    try {
      if (isReposted) {
        // Optimistic update
        setIsReposted(false);
        const newCount = Math.max(0, repostsCount - 1);
        setRepostsCount(newCount);

        const { error } = await supabase.from("reposts").delete().eq("post_id", post.id).eq("user_id", currentUserId);

        if (error) throw error;

        emitPostUpdate({ postId: post.id, reposts_count: newCount });
        toast.success("Repost removed");
        sessionStorage.setItem("blaze:refresh-feed", "1");
        window.dispatchEvent(new Event("blaze:refresh-feed"));
      } else {
        // Optimistic update
        setIsReposted(true);
        const newCount = repostsCount + 1;
        setRepostsCount(newCount);

        const { error } = await supabase.from("reposts").insert({
          post_id: post.id,
          user_id: currentUserId,
        });

        if (error) throw error;

        emitPostUpdate({ postId: post.id, reposts_count: newCount });
        toast.success("Reposted!");
        sessionStorage.setItem("blaze:refresh-feed", "1");
        window.dispatchEvent(new Event("blaze:refresh-feed"));
      }
    } catch (error: any) {
      // Rollback on error
      setIsReposted(previousState);
      setRepostsCount(previousCount);
      toast.error("Failed to repost");
    } finally {
      setIsReposting(false);
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

  const handlePostClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("img") || target.closest("video")) {
      return;
    }

    // Track view when clicking on post
    trackView();
    navigate(`/post/${post.id}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  return (
    <>
      <Card className="p-4 space-y-3 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={handlePostClick}>
        <div className="flex items-start gap-3">
          <Avatar className="cursor-pointer" onClick={() => navigate(`/profile/${post.profiles.id}`)}>
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span
                className="text-sm font-semibold hover:underline cursor-pointer"
                onClick={() => navigate(`/profile/${post.profiles.id}`)}
              >
                {post.profiles.display_name || post.profiles.username}
              </span>
              <span className="text-xs text-muted-foreground">@{post.profiles.username}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.updated_at !== post.created_at && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground italic">edited</span>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              {currentUserId === post.user_id ? (
                <>
                  {showPinButton && (
                    <Button variant="ghost" size="sm" onClick={onPin} title={isPinned ? "Unpin post" : "Pin post"}>
                      <Pin className={`h-4 w-4 ${isPinned ? "fill-current" : ""}`} />
                    </Button>
                  )}
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
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportDialog(true);
                  }}
                  title="Report post"
                >
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words">{parseMentions(post.content)}</p>
            {post.image_url && (
              <>
                {post.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                  <video src={post.image_url} controls className="mt-3 rounded-lg max-h-96 w-full" />
                ) : (
                  <img src={post.image_url} alt="Post media" className="mt-3 rounded-lg max-h-96 w-full object-cover" />
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-start sm:gap-3 pt-2">
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 min-w-0" onClick={handleLike}>
            <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs sm:text-sm">{formatNumber(likesCount)}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 min-w-0" onClick={handleBrokenHeart}>
            <ThumbsDown className={`h-4 w-4 ${isBrokenHearted ? "fill-blue-500 text-blue-500" : ""}`} />
            <span className="text-xs sm:text-sm">{formatNumber(brokenHeartsCount)}</span>
          </Button>
          {currentUserId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 min-w-0">
                  <Repeat2 className={`h-4 w-4 ${isReposted ? "fill-green-500 text-green-500" : ""}`} />
                  <span className="text-xs sm:text-sm">{formatNumber(repostsCount)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleRepost}>
                  <Repeat2 className="h-4 w-4 mr-2" />
                  {isReposted ? "Undo Repost" : "Repost"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-8 px-2 min-w-0"
              onClick={() => {
                toast.error("Please sign in to repost");
                navigate("/auth");
              }}
            >
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{formatNumber(repostsCount)}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 min-w-0" onClick={handleCommentClick}>
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs sm:text-sm">{formatNumber(commentsCount)}</span>
          </Button>
        </div>

        {showComments && currentUserId && <CommentSection postId={post.id} currentUserId={currentUserId} />}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="post"
        contentId={post.id}
      />
    </>
  );
};

export default Post;
