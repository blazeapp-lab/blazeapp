import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Post from "@/components/Post";
import CreatePost from "@/components/CreatePost";
import { toast } from "sonner";
import { mergePostUpdates } from "@/lib/postSync";

interface HomeProps {
  currentUserId: string | undefined;
}

const Home = ({ currentUserId }: HomeProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Unified refresh & visibility management
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout;

    const safeRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        fetchPosts();
      }, 250);
    };

    // Initial load
    fetchPosts();

    // Handlers
    const handleRefresh = () => safeRefresh();
    const handleFocus = () => safeRefresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") safeRefresh();
    };

    // Event listeners
    window.addEventListener("blaze:refresh-feed", handleRefresh);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blaze:refresh-feed", handleRefresh);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(refreshTimeout);
    };
  }, [currentUserId]);

  // Live-update feed counters when other views emit post updates
  useEffect(() => {
    const onPostUpdate = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail;
      if (!detail || !detail.postId) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === detail.postId
            ? {
                ...p,
                likes_count: detail.likes_count ?? p.likes_count,
                broken_hearts_count: detail.broken_hearts_count ?? p.broken_hearts_count,
                reposts_count: detail.reposts_count ?? p.reposts_count,
                comments_count: detail.comments_count ?? p.comments_count,
              }
            : p,
        ),
      );
    };

    window.addEventListener("blaze:update-post", onPostUpdate as EventListener);
    return () => {
      window.removeEventListener("blaze:update-post", onPostUpdate as EventListener);
    };
  }, []);

  // Core fetch logic
  const fetchPosts = async () => {
    try {
      if (!currentUserId) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data, error } = await supabase
          .from("posts")
          .select(
            `
            *,
            profiles!posts_user_id_fkey!inner (
              id,
              username,
              display_name,
              avatar_url,
              is_private
            )
          `,
          )
          .gte("created_at", oneWeekAgo.toISOString())
          .eq("profiles.is_private", false)
          .order("likes_count", { ascending: false })
          .limit(50);

        if (error) throw error;

        setPosts(data || []);
        return;
      }

      // Get followed users
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      const followingIds = followingData?.map((f) => f.following_id) || [];

      // Followed posts (3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      let followedPosts: any[] = [];
      if (followingIds.length > 0) {
        const { data } = await supabase
          .from("posts")
          .select(
            `
            *,
            profiles!posts_user_id_fkey!inner (
              id,
              username,
              display_name,
              avatar_url,
              is_private
            )
          `,
          )
          .in("user_id", followingIds)
          .gte("created_at", threeDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(25);

        followedPosts = data || [];
      }

      // Trending posts (7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: trendingData } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles!posts_user_id_fkey!inner (
            id,
            username,
            display_name,
            avatar_url,
            is_private
          )
        `,
        )
        .gte("created_at", oneWeekAgo.toISOString())
        .order("likes_count", { ascending: false })
        .limit(30);

      let trendingPosts = trendingData || [];
      trendingPosts = trendingPosts.filter(
        (post) => !post.profiles.is_private || post.user_id === currentUserId || followingIds.includes(post.user_id),
      );

      // Merge
      const postMap = new Map();
      followedPosts.forEach((p) => postMap.set(p.id, p));
      trendingPosts.forEach((p) => {
        if (!postMap.has(p.id)) postMap.set(p.id, p);
      });

      const combinedPosts = Array.from(postMap.values());

      // Sort by engagement + recency
      combinedPosts.sort((a, b) => {
        const aScore = a.likes_count * 2 + a.comments_count * 3 + a.reposts_count * 2;
        const bScore = b.likes_count * 2 + b.comments_count * 3 + b.reposts_count * 2;
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();

        const aFinal = aScore * 0.7 + (aTime / 1000000) * 0.3;
        const bFinal = bScore * 0.7 + (bTime / 1000000) * 0.3;

        return bFinal - aFinal;
      });

      // Apply local updates
      const merged = mergePostUpdates(combinedPosts);
      setPosts(merged);
    } catch (error: any) {
      toast.error("Failed to load posts");
    } finally {
      if (loading) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pt-2 sm:pt-4">
      <h1 className="text-2xl font-bold">Home</h1>

      {currentUserId && <CreatePost userId={currentUserId} onPostCreated={fetchPosts} />}

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        posts.map((post) => <Post key={post.id} post={post} currentUserId={currentUserId} onPostDeleted={fetchPosts} />)
      )}
    </div>
  );
};

export default Home;
