import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Post from "@/components/Post";
import CreatePost from "@/components/CreatePost";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface HomeProps {
  currentUserId: string | undefined;
}

const Home = ({ currentUserId }: HomeProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [currentUserId]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles!inner (
            id,
            username,
            display_name,
            avatar_url,
            is_private
          )
        `)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out posts from private accounts unless user is following them
      let filteredPosts = data || [];
      if (currentUserId) {
        // Get list of users the current user is following
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);
        
        const followingIds = followingData?.map(f => f.following_id) || [];
        
        // Filter out private posts unless following or own posts
        filteredPosts = filteredPosts.filter(post => 
          !post.profiles.is_private || 
          post.user_id === currentUserId ||
          followingIds.includes(post.user_id)
        );
      } else {
        // Not logged in - filter out all private accounts
        filteredPosts = filteredPosts.filter(post => !post.profiles.is_private);
      }
      
      setPosts(filteredPosts);
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
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Home</h1>
        {!currentUserId && (
          <Button onClick={() => window.location.href = '/auth'}>
            Sign in to post
          </Button>
        )}
      </div>
      
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
