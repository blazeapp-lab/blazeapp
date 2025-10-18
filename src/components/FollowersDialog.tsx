import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { toast } from "sonner";

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUserId?: string;
  defaultTab?: "followers" | "following";
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

const FollowersDialog = ({
  open,
  onOpenChange,
  userId,
  currentUserId,
  defaultTab = "followers",
}: FollowersDialogProps) => {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchFollowers();
      fetchFollowing();
      if (currentUserId) {
        fetchCurrentUserFollowing();
      }
    }
  }, [open, userId, currentUserId]);

  const fetchFollowers = async () => {
    try {
      const { data: followData, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (error) throw error;
      
      if (followData && followData.length > 0) {
        const followerIds = followData.map(f => f.follower_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", followerIds);
        
        if (profilesError) throw profilesError;
        setFollowers(profilesData || []);
      } else {
        setFollowers([]);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
      toast.error("Failed to load followers");
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data: followData, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (error) throw error;
      
      if (followData && followData.length > 0) {
        const followingIds = followData.map(f => f.following_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", followingIds);
        
        if (profilesError) throw profilesError;
        setFollowing(profilesData || []);
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
      toast.error("Failed to load following");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserFollowing = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      if (error) throw error;
      setFollowingIds(new Set(data.map((f) => f.following_id)));
    } catch (error) {
      console.error("Failed to fetch current user following:", error);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to follow users");
      return;
    }

    try {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });
      setFollowingIds((prev) => new Set(prev).add(targetUserId));
      toast.success("Followed successfully");
    } catch (error) {
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      
      setFollowingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
      toast.success("Unfollowed successfully");
    } catch (error) {
      toast.error("Failed to unfollow user");
    }
  };

  const handleNavigate = (targetUserId: string) => {
    onOpenChange(false);
    navigate(`/profile/${targetUserId}`);
  };

  const UserList = ({ 
    users, 
    currentUserId, 
    onNavigate, 
    onFollow, 
    onUnfollow 
  }: { 
    users: UserProfile[]; 
    currentUserId?: string; 
    onNavigate: (id: string) => void;
    onFollow: (id: string) => void;
    onUnfollow: (id: string) => void;
  }) => {
    if (loading) {
      return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
    }

    if (users.length === 0) {
      return <div className="py-8 text-center text-muted-foreground">No users found</div>;
    }

    return (
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer flex-1"
              onClick={() => onNavigate(user.id)}
            >
              <Avatar>
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>
            {currentUserId && currentUserId !== user.id && (
              <Button
                variant={followingIds.has(user.id) ? "outline" : "default"}
                size="sm"
                onClick={() =>
                  followingIds.has(user.id)
                    ? onUnfollow(user.id)
                    : onFollow(user.id)
                }
              >
                {followingIds.has(user.id) ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="followers" className="mt-4">
            <UserList 
              users={followers} 
              currentUserId={currentUserId}
              onNavigate={handleNavigate}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            <UserList 
              users={following} 
              currentUserId={currentUserId}
              onNavigate={handleNavigate}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
