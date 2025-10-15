import { Home, User, LogOut, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeaderProps {
  userId: string | undefined;
}

const Header = ({ userId }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: User, label: "Profile", path: `/profile/${userId}` },
  ];

  return (
    <header className="w-full border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
          >
            Blaze
          </button>
          
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
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
              <PenSquare className="mr-2 h-4 w-4" />
              New Post
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
