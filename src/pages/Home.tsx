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
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
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
