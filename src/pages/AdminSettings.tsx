import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import AdminNav from '@/components/AdminNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, Trash2 } from 'lucide-react';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [maxDailySignups, setMaxDailySignups] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    
    const { data: signupsData } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'signups_enabled')
      .single();

    const { data: limitsData } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'max_daily_signups')
      .single();

    if (signupsData) {
      const value = signupsData.setting_value as any;
      setSignupsEnabled(value.enabled);
    }

    if (limitsData) {
      const value = limitsData.setting_value as any;
      setMaxDailySignups(value.limit?.toString() || '');
    }

    setLoading(false);
  };

  const handleSave = async () => {
    const { error: signupsError } = await supabase
      .from('app_settings')
      .update({
        setting_value: { enabled: signupsEnabled },
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', 'signups_enabled');

    const { error: limitsError } = await supabase
      .from('app_settings')
      .update({
        setting_value: { limit: maxDailySignups ? parseInt(maxDailySignups) : null },
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', 'max_daily_signups');

    if (signupsError || limitsError) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved successfully');
    }
  };

  const handleDeleteAllPosts = async () => {
    if (!confirm('Are you sure you want to delete ALL posts? This action cannot be undone!')) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-all-posts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete posts');
      }

      toast.success("All posts deleted successfully");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || !isAdmin || loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 pt-8 pb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">App Settings</h1>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Signups</CardTitle>
                <CardDescription>
                  Control new user registrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable Signups</div>
                    <div className="text-sm text-muted-foreground">
                      Allow new users to create accounts
                    </div>
                  </div>
                  <Switch
                    checked={signupsEnabled}
                    onCheckedChange={setSignupsEnabled}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Maximum Daily Signups
                  </label>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={maxDailySignups}
                    onChange={(e) => setMaxDailySignups(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Limit the number of new accounts per day
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect all data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-1">Delete All Posts</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Permanently delete all posts and related data (likes, comments, etc.)
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllPosts}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Posts
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
