import { Home, User, LogOut, PenSquare, Search as SearchIcon, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import blazeLogo from "@/assets/blaze-logo-new.png";
import { useAdmin } from '@/hooks/useAdmin';

interface HeaderProps {
  userId?: string;
}

const Header = ({ userId }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAdmin } = useAdmin();

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

  return (
    <header className="w-full border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate("/")}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={blazeLogo} alt="Blaze" className="h-10 w-10" />
          </button>
          
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {userId ? (
              <>
                <Button
                  variant={location.pathname === "/" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/")}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <Home className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={location.pathname === "/search" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/search")}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <SearchIcon className="h-4 w-4" />
                </Button>

                {isAdmin ? (
                  <>
                    <Button
                      variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => navigate("/admin")}
                      className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                <Button
                  variant={location.pathname === "/notifications" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/notifications")}
                  className="relative h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
                
                <Button
                  variant={location.pathname === `/profile/${userId}` ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate(`/profile/${userId}`)}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <User className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const createPostBtn = document.getElementById("create-post-trigger");
                    createPostBtn?.click();
                  }}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <PenSquare className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={location.pathname === "/search" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/search")}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <SearchIcon className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
                >
                  Sign in
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
