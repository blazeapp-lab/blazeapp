import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, MessageCircle, UserPlus, Repeat2, HeartCrack, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  created_at: string;
  is_read: boolean;
  post_id: string | null;
  comment_id: string | null;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        created_at,
        is_read,
        post_id,
        comment_id,
        actor:profiles!notifications_actor_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to fetch notifications");
    } else {
      setNotifications(data as any);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast.error("Failed to mark all as read");
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.type === "follow") {
      navigate(`/profile/${notification.actor?.id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "comment":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case "repost":
        return <Repeat2 className="h-5 w-5 text-purple-500" />;
      case "broken_heart":
        return <HeartCrack className="h-5 w-5 text-orange-500" />;
      case "comment_like":
        return <ThumbsUp className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (type: string) => {
    switch (type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "follow":
        return "started following you";
      case "repost":
        return "reposted your post";
      case "broken_heart":
        return "reacted with 💔 to your post";
      case "comment_like":
        return "liked your comment";
      default:
        return "interacted with your content";
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No notifications yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                !notification.is_read ? "bg-accent/50" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.actor?.avatar_url || undefined} />
                    <AvatarFallback>
                      {notification.actor?.display_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(notification.type)}
                      <p className="text-sm">
                        <span className="font-semibold">
                          {notification.actor?.display_name || "Someone"}
                        </span>{" "}
                        {getNotificationText(notification.type)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
