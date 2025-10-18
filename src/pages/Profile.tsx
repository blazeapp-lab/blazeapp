import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin, Link as LinkIcon, Calendar, ArrowLeft, Settings, Ban, Pin } from "lucide-react";
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
  pinned_post_id: string | null;
}

interface ProfileProps {
  currentUserId: string | undefined;
}

const Profile = ({ currentUserId }: ProfileProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [pinnedPost, setPinnedPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const [blockStatusLoading, setBlockStatusLoading] = useState(true);

  useEffect(() => {
    const initializeProfile = async () => {
      if (userId) {
        const profileData = await fetchProfile();
        if (profileData) {
          await Promise.all([
            fetchFollowData(profileData.id),
            fetchBlockStatus(profileData.id)
          ]);
        }
      }
    };
    initializeProfile();
  }, [userId, currentUserId]);

  useEffect(() => {
    if (profile && !blockStatusLoading) {
      fetchUserPosts();
    }
  }, [profile, isFollowing, currentUserId, isBlockedByUser, blockStatusLoading]);

  const fetchProfile = async () => {
    try {
      // Check if userId is a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || "");
      
      let query = supabase.from("profiles").select("*");
      
      if (isUUID) {
        query = query.eq("id", userId);
      } else {
        // Treat as username (case-insensitive)
        query = query.ilike("username", userId || "");
      }
      
      const { data, error } = await query.single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error: any) {
      toast.error("Failed to load profile");
      navigate("/");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    // Blocked users (either direction) cannot view posts
    if (isBlockedByUser || isBlocked) {
      setPosts([]);
      setPinnedPost(null);
      setCanViewPosts(false);
      return;
    }

    // Check if user can view posts
    if (profile?.is_private && currentUserId !== profile.id && !isFollowing) {
      setPosts([]);
      setPinnedPost(null);
      setCanViewPosts(false);
      return;
    }
    
    setCanViewPosts(true);
    
    // Fetch pinned post if it exists
    if (profile?.pinned_post_id) {
      const { data: pinned } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("id", profile.pinned_post_id)
        .maybeSingle();
      
      setPinnedPost(pinned);
    } else {
      setPinnedPost(null);
    }
    
    // Fetch original posts
    const { data: originalPosts, error: postsError } = await supabase
      .from("posts")
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("user_id", profile.id)
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
          profiles!posts_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq("user_id", profile.id);

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
    let allPosts = [...(originalPosts || []), ...repostedPosts].sort((a, b) => {
      const dateA = new Date(a.reposted_at || a.created_at);
      const dateB = new Date(b.reposted_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    // Remove pinned post from regular posts list
    if (profile?.pinned_post_id) {
      allPosts = allPosts.filter(p => p.id !== profile.pinned_post_id);
    }

    setPosts(allPosts);
  };

  const fetchFollowData = async (profileId: string) => {
    if (!profileId) return;

    // Get follower count
    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId);

    // Get following count
    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId);

    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);

    // Check if current user is following this profile
    if (currentUserId && currentUserId !== profileId) {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId)
        .maybeSingle();
      
      setIsFollowing(!!data);
    }
  };

  const fetchBlockStatus = async (profileId: string) => {
    if (!currentUserId || !profileId || currentUserId === profileId) {
      setBlockStatusLoading(false);
      return;
    }

    try {
      // Check if current user blocked this profile
      const { data: blockedData, error: blockedError } = await (supabase as any)
        .from("blocks")
        .select("id")
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", profileId)
        .maybeSingle();
      
      if (blockedError) {
        console.error("Error checking if user blocked profile:", blockedError);
      }
      setIsBlocked(!!blockedData);

      // Check if current user is blocked BY this profile using a secure RPC (bypasses RLS)
      const { data: blockedByValue, error: blockedByError } = await supabase.rpc("is_blocked", {
        viewer_id: currentUserId,
        owner_id: profileId,
      });
      
      if (blockedByError) {
        console.error("Error checking if blocked by user (rpc):", blockedByError);
      }
      setIsBlockedByUser(!!blockedByValue);
    } catch (error) {
      console.error("Failed to fetch block status:", error);
    } finally {
      setBlockStatusLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!currentUserId || !profile) {
      toast.error("Please sign in to block users");
      navigate("/auth");
      return;
    }

    try {
      if (isBlocked) {
        const { error } = await (supabase as any)
          .from("blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", profile.id);
        
        if (error) {
          console.error("Error unblocking user:", error);
          throw error;
        }
        setIsBlocked(false);
        toast.success("User unblocked");
      } else {
        const { error } = await (supabase as any)
          .from("blocks")
          .insert({
            blocker_id: currentUserId,
            blocked_id: profile.id,
          });
        
        if (error) {
          console.error("Error blocking user:", error);
          throw error;
        }
        setIsBlocked(true);
        toast.success("User blocked");
      }
    } catch (error: any) {
      console.error("Block operation failed:", error);
      toast.error("Failed to update block status");
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || !profile) {
      toast.error("Please sign in to follow users");
      navigate("/auth");
      return;
    }

    if (isBlockedByUser || isBlocked) {
      toast.error("You cannot follow this user");
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profile.id);
        setIsFollowing(false);
        setFollowerCount((prev) => prev - 1);
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: profile.id,
          });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error("Failed to update follow status");
    }
  };

  const handlePinPost = async (postId: string) => {
    if (!currentUserId || !profile) return;

    try {
      const newPinnedId = profile.pinned_post_id === postId ? null : postId;
      
      const { error } = await supabase
        .from("profiles")
        .update({ pinned_post_id: newPinnedId })
        .eq("id", currentUserId);

      if (error) throw error;

      setProfile({ ...profile, pinned_post_id: newPinnedId });
      toast.success(newPinnedId ? "Post pinned" : "Post unpinned");
      fetchUserPosts();
    } catch (error: any) {
      toast.error("Failed to pin post");
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
            userId={profile.id}
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
          {currentUserId !== profile.id && !isBlockedByUser && !isBlocked && (
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant={isFollowing ? "secondary" : "default"} 
                onClick={handleFollow}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
              <Button 
                variant={isBlocked ? "secondary" : "outline"} 
                size="icon"
                onClick={handleBlock}
                title={isBlocked ? "Unblock" : "Block"}
              >
                <Ban className="h-4 w-4" />
              </Button>
            </div>
          )}
          {currentUserId === profile.id && (
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
        {currentUserId === profile.id && (
          <CreatePost userId={currentUserId} onPostCreated={fetchUserPosts} />
        )}
        {(isBlockedByUser || isBlocked) ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <p className="text-muted-foreground">You cannot view this profile</p>
            <p className="text-sm text-muted-foreground mt-2">You can no longer view this profile or follow this user</p>
          </div>
        ) : !canViewPosts ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <p className="text-muted-foreground">This account is private</p>
            <p className="text-sm text-muted-foreground mt-2">Follow to see their posts</p>
          </div>
        ) : (
          <>
            {pinnedPost && (
              <div className="relative">
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
                  <Pin className="h-4 w-4" />
                  <span>Pinned post</span>
                </div>
                <Post 
                  key={pinnedPost.id} 
                  post={pinnedPost} 
                  currentUserId={currentUserId} 
                  onPostDeleted={fetchUserPosts}
                  showPinButton={currentUserId === profile.id}
                  isPinned={true}
                  onPin={() => handlePinPost(pinnedPost.id)}
                />
              </div>
            )}
            {posts.length === 0 && !pinnedPost ? (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            ) : (
              posts.map((post) => (
                <Post 
                  key={post.id} 
                  post={post} 
                  currentUserId={currentUserId} 
                  onPostDeleted={fetchUserPosts}
                  showPinButton={currentUserId === profile.id}
                  isPinned={false}
                  onPin={() => handlePinPost(post.id)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default Profile;
