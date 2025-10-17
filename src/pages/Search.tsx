import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Search as SearchIcon, User, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Post from "@/components/Post";
import { toast } from "sonner";

interface SearchProps {
  currentUserId: string | undefined;
}

const Search = ({ currentUserId }: SearchProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Search profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
        .limit(20);

      if (profileError) throw profileError;
      setProfiles(profileData || []);

      // Search posts
      const { data: postData, error: postError } = await supabase
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
        .ilike("content", `%${searchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postError) throw postError;
      
      // Filter out posts from private accounts unless user is following them
      let filteredPosts = postData || [];
      if (currentUserId) {
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);
        
        const followingIds = followingData?.map(f => f.following_id) || [];
        
        filteredPosts = filteredPosts.filter(post => 
          !post.profiles.is_private || 
          post.user_id === currentUserId ||
          followingIds.includes(post.user_id)
        );
      } else {
        filteredPosts = filteredPosts.filter(post => !post.profiles.is_private);
      }
      
      setPosts(filteredPosts);
    } catch (error: any) {
      toast.error("Failed to search");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data, error } = await supabase
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
          .gte("created_at", oneWeekAgo.toISOString())
          .order("likes_count", { ascending: false })
          .order("comments_count", { ascending: false })
          .order("reposts_count", { ascending: false })
          .limit(20);

        if (error) throw error;
        
        // Filter out posts from private accounts unless user is following them
        let filteredPosts = data || [];
        if (currentUserId) {
          const { data: followingData } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", currentUserId);
          
          const followingIds = followingData?.map(f => f.following_id) || [];
          
          filteredPosts = filteredPosts.filter(post => 
            !post.profiles.is_private || 
            post.user_id === currentUserId ||
            followingIds.includes(post.user_id)
          );
        } else {
          filteredPosts = filteredPosts.filter(post => !post.profiles.is_private);
        }
        
        setTrendingPosts(filteredPosts);
      } catch (error) {
        console.error("Failed to fetch trending posts:", error);
      }
    };

    fetchTrendingPosts();
  }, [currentUserId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Search</h1>
        
        <div className="flex gap-2">
          <Input
            placeholder="Search for people, posts, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <SearchIcon className="h-4 w-4 mr-2" />
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {hasSearched && (
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">
              Posts ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="profiles">
              People ({profiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No posts found for "{searchQuery}"
              </Card>
            ) : (
              posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onPostDeleted={handleSearch}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="profiles" className="space-y-4 mt-6">
            {profiles.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No people found for "{searchQuery}"
              </Card>
            ) : (
              profiles.map((profile) => (
                <Card
                  key={profile.id}
                  className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/profile/${profile.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {profile.display_name || profile.username}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        @{profile.username}
                      </p>
                      {profile.bio && (
                        <p className="text-sm mt-1 line-clamp-2">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {!hasSearched && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Trending This Week</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Most popular posts from the last 7 days
            </p>
          </Card>
          
          {trendingPosts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No trending posts this week
            </Card>
          ) : (
            <div className="space-y-4">
              {trendingPosts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onPostDeleted={() => {
                    setTrendingPosts(trendingPosts.filter(p => p.id !== post.id));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
