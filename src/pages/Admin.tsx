import { Link } from 'react-router-dom';
import AdminNav from '@/components/AdminNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Flag, Settings as SettingsIcon } from 'lucide-react';

const Admin = () => {

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 pt-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/admin/users">
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    View, suspend, and manage user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Bulk operations, suspensions, and user deletions
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/reports">
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Content Reports
                  </CardTitle>
                  <CardDescription>
                    Review and moderate reported content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Posts, comments, and profiles flagged by users
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/settings">
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    App Settings
                  </CardTitle>
                  <CardDescription>
                    Control signups and platform settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Enable/disable signups and set limits
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
