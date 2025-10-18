import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUserId: string | undefined;
  defaultTab?: "followers" | "following";
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  isFollowing?: boolean;
}

const FollowersDialog = ({ open, onOpenChange, userId, currentUserId, defaultTab = "followers" }: FollowersDialogProps) => {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [open, userId, currentUserId]);

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("following_id", userId);

      if (error) throw error;

      const followerProfiles = data.map((f: any) => f.profiles).filter(Boolean);
      
      // Check if current user is following each follower
      if (currentUserId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);
        
        const followingIds = new Set(followData?.map((f) => f.following_id) || []);
        
        followerProfiles.forEach((profile: UserProfile) => {
          profile.isFollowing = followingIds.has(profile.id);
        });
      }

      setFollowers(followerProfiles);
    } catch (error) {
      toast.error("Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("follower_id", userId);

      if (error) throw error;

      const followingProfiles = data.map((f: any) => f.profiles).filter(Boolean);
      
      // Check if current user is following each user
      if (currentUserId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);
        
        const followingIds = new Set(followData?.map((f) => f.following_id) || []);
        
        followingProfiles.forEach((profile: UserProfile) => {
          profile.isFollowing = followingIds.has(profile.id);
        });
      }

      setFollowing(followingProfiles);
    } catch (error) {
      toast.error("Failed to load following");
    }
  };

  const handleFollow = async (profileId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to follow users");
      return;
    }

    try {
      await supabase
        .from("follows")
        .insert({
          follower_id: currentUserId,
          following_id: profileId,
        });

      // Update local state
      setFollowers(followers.map(f => 
        f.id === profileId ? { ...f, isFollowing: true } : f
      ));
      setFollowing(following.map(f => 
        f.id === profileId ? { ...f, isFollowing: true } : f
      ));
      
      toast.success("Followed successfully");
    } catch (error) {
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async (profileId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);

      // Update local state
      setFollowers(followers.map(f => 
        f.id === profileId ? { ...f, isFollowing: false } : f
      ));
      setFollowing(following.map(f => 
        f.id === profileId ? { ...f, isFollowing: false } : f
      ));
      
      toast.success("Unfollowed successfully");
    } catch (error) {
      toast.error("Failed to unfollow user");
    }
  };

  const UserList = ({ users }: { users: UserProfile[] }) => (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {users.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No users found</p>
      ) : (
        users.map((user) => (
          <div key={user.id} className="flex items-center justify-between py-2">
            <div 
              className="flex items-center gap-3 cursor-pointer flex-1"
              onClick={() => {
                navigate(`/profile/${user.id}`);
                onOpenChange(false);
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>
            {currentUserId && currentUserId !== user.id && (
              <Button
                variant={user.isFollowing ? "outline" : "default"}
                size="sm"
                onClick={() => user.isFollowing ? handleUnfollow(user.id) : handleFollow(user.id)}
              >
                {user.isFollowing ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="followers" className="mt-4">
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : (
              <UserList users={followers} />
            )}
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : (
              <UserList users={following} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
