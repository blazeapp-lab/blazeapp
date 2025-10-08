import { Home, User, LogOut, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import blazeLogo from "@/assets/blaze-logo.png";

interface SidebarProps {
  userId: string | undefined;
}

const Sidebar = ({ userId }: SidebarProps) => {
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
    <aside className="w-64 border-r border-border bg-card h-screen sticky top-0 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <img src={blazeLogo} alt="Blaze" className="h-12 w-12" />
        <h1 className="text-2xl font-bold text-primary">Blaze</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate(item.path)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 space-y-2">
        <Button
          variant="default"
          className="w-full"
          onClick={() => {
            const createPostBtn = document.getElementById("create-post-trigger");
            createPostBtn?.click();
          }}
        >
          <PenSquare className="mr-2 h-5 w-5" />
          New Post
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
