import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Post from "@/components/Post";
import CreatePost from "@/components/CreatePost";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mergePostUpdates, clearPostUpdates } from "@/lib/postSync";
interface HomeProps {
  currentUserId: string | undefined;
}

const Home = ({ currentUserId }: HomeProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [currentUserId]);

  // Refresh feed when PostDetail updates interactions
  useEffect(() => {
    const onRefresh = (_e: Event) => {
      fetchPosts();
    };
    window.addEventListener("blaze:refresh-feed", onRefresh);
    return () => {
      window.removeEventListener("blaze:refresh-feed", onRefresh);
    };
  }, [currentUserId]);

  // Also refetch on focus/visibility if a refresh flag was set while away
  useEffect(() => {
    const maybeRefresh = () => {
      if (sessionStorage.getItem("blaze:refresh-feed")) {
        sessionStorage.removeItem("blaze:refresh-feed");
        fetchPosts();
      }
    };
    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") maybeRefresh();
    });
    // Run once on mount
    maybeRefresh();
    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", maybeRefresh as any);
    };
  }, [currentUserId]);
  const fetchPosts = async () => {
    try {
      if (!currentUserId) {
        // Not logged in - just show trending posts from this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!posts_user_id_fkey!inner (
              id,
              username,
              display_name,
              avatar_url,
              is_private
            )
          `)
          .gte("created_at", oneWeekAgo.toISOString())
          .eq("profiles.is_private", false)
          .order("likes_count", { ascending: false })
          .limit(50);

        if (error) throw error;
        
        setPosts(data || []);
        return;
      }

      // Get list of users the current user is following
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      
      const followingIds = followingData?.map(f => f.following_id) || [];

      // Fetch recent posts from followed users (last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      let followedPosts: any[] = [];
      if (followingIds.length > 0) {
        const { data } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!posts_user_id_fkey!inner (
              id,
              username,
              display_name,
              avatar_url,
              is_private
            )
          `)
          .in("user_id", followingIds)
          .gte("created_at", threeDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(25);
        
        followedPosts = data || [];
      }

      // Fetch trending posts from this week (high engagement)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: trendingData } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey!inner (
            id,
            username,
            display_name,
            avatar_url,
            is_private
          )
        `)
        .gte("created_at", oneWeekAgo.toISOString())
        .order("likes_count", { ascending: false })
        .limit(30);

      // Filter trending posts for privacy
      let trendingPosts = trendingData || [];
      trendingPosts = trendingPosts.filter(post => 
        !post.profiles.is_private || 
        post.user_id === currentUserId ||
        followingIds.includes(post.user_id)
      );

      // Combine and remove duplicates (prefer followed posts)
      const postMap = new Map();
      followedPosts.forEach(post => postMap.set(post.id, post));
      trendingPosts.forEach(post => {
        if (!postMap.has(post.id)) {
          postMap.set(post.id, post);
        }
      });

      // Convert to array and mix followed/trending
      const combinedPosts = Array.from(postMap.values());
      
      // Sort by a mix of recency and engagement
      combinedPosts.sort((a, b) => {
        const aScore = a.likes_count * 2 + a.comments_count * 3 + a.reposts_count * 2;
        const bScore = b.likes_count * 2 + b.comments_count * 3 + b.reposts_count * 2;
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        
        // Weighted score: 70% engagement, 30% recency
        const aFinal = (aScore * 0.7) + ((aTime / 1000000) * 0.3);
        const bFinal = (bScore * 0.7) + ((bTime / 1000000) * 0.3);
        
        return bFinal - aFinal;
      });
      
      // Apply any locally recorded updates (from interactions while away)
      const merged = mergePostUpdates(combinedPosts);
      setPosts(merged);
      clearPostUpdates();
    } catch (error: any) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
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
        posts.map((post) => (
          <Post key={post.id} post={post} currentUserId={currentUserId} onPostDeleted={fetchPosts} />
        ))
      )}
    </div>
  );
};

export default Home;
