import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Flag, Settings, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const AdminNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (data?.username) {
          setUsername(data.username);
        }
      }
    };

    fetchUsername();
  }, [user?.id]);
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              <span>Admin Panel</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              <Link to="/admin">
                <Button 
                  variant={isActive('/admin') ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/admin/users">
                <Button 
                  variant={isActive('/admin/users') ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </Button>
              </Link>
              <Link to="/admin/reports">
                <Button 
                  variant={isActive('/admin/reports') ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button 
                  variant={isActive('/admin/settings') ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                Back to App
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">
              {username || user?.email}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;
