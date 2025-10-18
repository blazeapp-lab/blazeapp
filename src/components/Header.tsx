import { Home, User, LogOut, PenSquare, Search as SearchIcon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import blazeLogo from "@/assets/blaze-logo-new.png";

interface HeaderProps {
  userId: string | undefined;
}

const Header = ({ userId }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  // If user is not logged in, show simplified header
  if (!userId) {
    return (
      <header className="w-full border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="hover:opacity-80 transition-opacity"
            >
              <img src={blazeLogo} alt="Blaze" className="h-10 w-10" />
            </button>
            
            <Button onClick={() => navigate("/auth")}>
              Sign in to post
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: SearchIcon, label: "Search", path: "/search" },
    { icon: Bell, label: "Notifications", path: "/notifications", badge: unreadCount },
    { icon: User, label: "Profile", path: `/profile/${userId}` },
  ];

  return (
    <header className="w-full border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={blazeLogo} alt="Blaze" className="h-10 w-10" />
          </button>
          
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="relative"
                >
                  <Icon className="h-4 w-4" />
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
            
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const createPostBtn = document.getElementById("create-post-trigger");
                createPostBtn?.click();
              }}
            >
              <PenSquare className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
