import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostProps {
  post: any;
  currentUserId?: string;
  onPostDeleted?: () => void;
}

// Helper to emit live post updates
const emitPostUpdate = (update: Record<string, any>) => {
  window.dispatchEvent(new CustomEvent("blaze:update-post", { detail: update }));
};

const Post = ({ post, currentUserId, onPostDeleted }: PostProps) => {
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [brokenHeartsCount, setBrokenHeartsCount] = useState(post.broken_hearts_count || 0);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);

  // --- LIKE HANDLER ---
  const handleLike = async () => {
    try {
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      });

      setLikesCount((prev) => prev + 1);
      emitPostUpdate({
        postId: post.id,
        likes_count: likesCount + 1,
      });
    } catch (err) {
      toast.error("Failed to like post");
    }
  };

  // --- UNLIKE HANDLER ---
  const handleUnlike = async () => {
    try {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);

      setLikesCount((prev) => prev - 1);
      emitPostUpdate({
        postId: post.id,
        likes_count: likesCount - 1,
      });
    } catch (err) {
      toast.error("Failed to unlike post");
    }
  };

  // --- BROKEN HEART / DISLIKE ---
  const handleBrokenHeart = async () => {
    try {
      setBrokenHeartsCount((prev) => prev + 1);
      emitPostUpdate({
        postId: post.id,
        broken_hearts_count: brokenHeartsCount + 1,
      });
    } catch (err) {
      toast.error("Failed to dislike post");
    }
  };

  // --- REPOST ---
  const handleRepost = async () => {
    try {
      setRepostsCount((prev) => prev + 1);
      emitPostUpdate({
        postId: post.id,
        reposts_count: repostsCount + 1,
      });
    } catch (err) {
      toast.error("Failed to repost");
    }
  };

  // --- COMMENT ADDED ---
  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
    emitPostUpdate({
      postId: post.id,
      comments_count: commentsCount + 1,
    });
  };

  // --- DELETE POST ---
  const handleDelete = async () => {
    try {
      await supabase.from("posts").delete().eq("id", post.id);
      onPostDeleted?.();
      // Structural change, so full refresh is appropriate
      window.dispatchEvent(new Event("blaze:refresh-feed"));
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-background">
      <div className="font-semibold">{post.profiles?.display_name}</div>
      <div className="text-sm text-muted-foreground">@{post.profiles?.username}</div>
      <p className="mt-2">{post.content}</p>

      <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
        <button onClick={handleLike}>❤️ {likesCount}</button>
        <button onClick={handleBrokenHeart}>💔 {brokenHeartsCount}</button>
        <button onClick={handleRepost}>🔁 {repostsCount}</button>
        <button onClick={handleCommentAdded}>💬 {commentsCount}</button>
        {currentUserId === post.user_id && (
          <button onClick={handleDelete} className="text-destructive ml-auto">
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default Post;
