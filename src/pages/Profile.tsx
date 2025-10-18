import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin, Link as LinkIcon, Calendar, ArrowLeft, Settings } from "lucide-react";
import Post from "@/components/Post";
import EditProfileDialog from "@/components/EditProfileDialog";
import CreatePost from "@/components/CreatePost";
import FollowersDialog from "@/components/FollowersDialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  website: string | null;
  location: string | null;
  created_at: string;
  is_private: boolean;
}

interface ProfileProps {
  currentUserId: string | undefined;
}

const Profile = ({ currentUserId }: ProfileProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFollowData();
    }
  }, [userId, currentUserId]);

  useEffect(() => {
    if (profile) {
      fetchUserPosts();
    }
  }, [profile, isFollowing, currentUserId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Failed to load profile");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    // Check if user can view posts
    if (profile?.is_private && currentUserId !== userId && !isFollowing) {
      setPosts([]);
      setCanViewPosts(false);
      return;
    }
    
    setCanViewPosts(true);
    
    // Fetch original posts
    const { data: originalPosts, error: postsError } = await supabase
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
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (postsError) {
      toast.error("Failed to load posts");
      return;
    }

    // Fetch reposts
    const { data: repostData, error: repostsError } = await supabase
      .from("reposts")
      .select(`
        created_at,
        posts (
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq("user_id", userId);

    if (repostsError) {
      toast.error("Failed to load reposts");
      return;
    }

    // Flatten reposts and add repost metadata
    const repostedPosts = (repostData || []).map((repost: any) => ({
      ...repost.posts,
      reposted_at: repost.created_at,
      is_repost: true
    }));

    // Combine and sort by date (using repost date for reposts, created_at for originals)
    const allPosts = [...(originalPosts || []), ...repostedPosts].sort((a, b) => {
      const dateA = new Date(a.reposted_at || a.created_at);
      const dateB = new Date(b.reposted_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    setPosts(allPosts);
  };

  const fetchFollowData = async () => {
    if (!userId) return;

    // Get follower count
    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    // Get following count
    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);

    // Check if current user is following this profile
    if (currentUserId && currentUserId !== userId) {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
        .maybeSingle();
      
      setIsFollowing(!!data);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to follow users");
      navigate("/auth");
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", userId);
        setIsFollowing(false);
        setFollowerCount((prev) => prev - 1);
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: userId,
          });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error("Failed to update follow status");
    }
  };

  if (loading || !profile) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <>
      {profile && (
        <>
          <EditProfileDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            profile={profile}
            onProfileUpdated={() => {
              fetchProfile();
              fetchUserPosts();
            }}
          />
          <FollowersDialog
            open={followersDialogOpen}
            onOpenChange={setFollowersDialogOpen}
            userId={userId!}
            currentUserId={currentUserId}
            defaultTab={followersDialogTab}
          />
        </>
      )}
      
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

      <div className="bg-card rounded-lg overflow-hidden">
        <div
          className="h-48 bg-secondary relative"
          style={{
            backgroundImage: profile.banner_url ? `url(${profile.banner_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {currentUserId === userId && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate("/settings")}
              className="absolute top-4 right-4"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start -mt-16 mb-4">
            <Avatar className="h-32 w-32 border-4 border-card">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-4xl">
                <User />
              </AvatarFallback>
            </Avatar>
            {currentUserId === userId ? (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                Edit Profile
              </Button>
            ) : currentUserId ? (
              <Button 
                variant={isFollowing ? "outline" : "default"} 
                onClick={handleFollow}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>

            {profile.bio && <p className="text-sm">{profile.bio}</p>}

            <div className="flex gap-4 text-sm">
              <button
                onClick={() => {
                  setFollowersDialogTab("followers");
                  setFollowersDialogOpen(true);
                }}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="font-semibold text-foreground">{followerCount}</span>
                <span className="text-muted-foreground">Followers</span>
              </button>
              <button
                onClick={() => {
                  setFollowersDialogTab("following");
                  setFollowersDialogOpen(true);
                }}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="font-semibold text-foreground">{followingCount}</span>
                <span className="text-muted-foreground">Following</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </div>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <LinkIcon className="h-4 w-4" />
                  {new URL(profile.website).hostname}
                </a>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {format(new Date(profile.created_at), "MMMM yyyy")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Posts</h2>
        {currentUserId === userId && (
          <CreatePost userId={currentUserId} onPostCreated={fetchUserPosts} />
        )}
        {!canViewPosts ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <p className="text-muted-foreground">This account is private</p>
            <p className="text-sm text-muted-foreground mt-2">Follow to see their posts</p>
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No posts yet</p>
        ) : (
        posts.map((post) => (
          <Post key={post.id} post={post} currentUserId={currentUserId} onPostDeleted={fetchUserPosts} />
        ))
        )}
      </div>
    </div>
    </>
  );
};

export default Profile;
