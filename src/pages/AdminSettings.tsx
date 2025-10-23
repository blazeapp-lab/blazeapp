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
import { Save, Trash2, HardDrive, Loader2 } from 'lucide-react';

const AdminSettings = () => {
  const { isAdmin } = useAdmin();
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [maxDailySignups, setMaxDailySignups] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [spamChecking, setSpamChecking] = useState(false);
  const [storageStats, setStorageStats] = useState<{ totalSize: number; fileCount: number } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [blockedPhrases, setBlockedPhrases] = useState<Array<{ id: string; phrase: string }>>([]);
  const [newPhrase, setNewPhrase] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchBlockedPhrases();
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

  const handleBanSpammers = async () => {
    if (!confirm('This will automatically ban users posting more than 5 times per minute. Continue?')) {
      return;
    }

    try {
      setSpamChecking(true);
      const { data, error } = await supabase.functions.invoke('check-spam', {
        body: { action: 'ban_spam_users', min_posts: 5 }
      });

      if (error) throw error;

      toast.success(`Banned ${data.banned_count} spam accounts`);
      if (data.banned_count > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to ban spammers');
    } finally {
      setSpamChecking(false);
    }
  };

  const handleCleanupOldData = async () => {
    if (!confirm('This will delete old logs and data older than 30 days. Continue?')) {
      return;
    }

    try {
      setSpamChecking(true);
      const { error } = await supabase.functions.invoke('check-spam', {
        body: { action: 'cleanup_old_data' }
      });

      if (error) throw error;

      toast.success('Old data cleaned up successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cleanup data');
    } finally {
      setSpamChecking(false);
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

  const handleDeleteAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete ALL notifications? This action cannot be undone!')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('admin_delete_all_notifications');
      
      if (error) throw error;

      toast.success("All notifications deleted successfully");
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAllUsers = async () => {
    if (!confirm('Are you sure you want to sign out ALL users? This will revoke all active sessions immediately!')) {
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_revoke_all_sessions');
      
      if (error) throw error;

      const result = data as { success: boolean; sessions_revoked: number };
      toast.success(`Successfully signed out all users (${result.sessions_revoked} sessions revoked)`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllFollows = async () => {
    if (!confirm('Are you sure you want to delete ALL follows? This action cannot be undone!')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('admin_delete_all_follows');
      
      if (error) throw error;

      toast.success("All follows deleted successfully");
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete follows');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedPhrases = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_phrases')
        .select('id, phrase')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedPhrases(data || []);
    } catch (error: any) {
      console.error('Failed to fetch blocked phrases:', error);
    }
  };

  const handleAddBlockedPhrase = async () => {
    if (!newPhrase.trim()) {
      toast.error('Please enter a phrase');
      return;
    }

    try {
      const { error } = await supabase
        .from('blocked_phrases')
        .insert({ phrase: newPhrase, created_by: (await supabase.auth.getUser()).data.user?.id });

      if (error) throw error;

      toast.success('Blocked phrase added');
      setNewPhrase('');
      fetchBlockedPhrases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add blocked phrase');
    }
  };

  const handleDeleteBlockedPhrase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_phrases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Blocked phrase deleted');
      fetchBlockedPhrases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete blocked phrase');
    }
  };

  const fetchStorageStats = async () => {
    setStorageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('storage-cleanup', {
        body: { action: 'get_bucket_size', bucket: 'profiles' }
      });

      if (error) throw error;

      setStorageStats(data);
    } catch (error: any) {
      toast.error('Failed to fetch storage stats: ' + error.message);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleCleanupOldStorage = async () => {
    if (!confirm('This will delete all storage files older than 30 days. Continue?')) {
      return;
    }

    try {
      setStorageLoading(true);
      const { data, error } = await supabase.functions.invoke('storage-cleanup', {
        body: { action: 'delete_old_files', bucket: 'profiles' }
      });

      if (error) throw error;

      toast.success(`Deleted ${data.deletedCount} old files`);
      fetchStorageStats();
    } catch (error: any) {
      toast.error('Failed to cleanup storage: ' + error.message);
    } finally {
      setStorageLoading(false);
    }
  };

  if (!isAdmin || loading) return null;

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

            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-orange-600">Anti-Spam Controls</CardTitle>
                <CardDescription>
                  Protect your site from bot attacks and spam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-1">Blocked Phrases</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Prevent posts with exact text matches (including emojis)
                    </div>
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder='e.g. "Loving the vibes here! ✌️"'
                        value={newPhrase}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedPhrase()}
                      />
                      <Button onClick={handleAddBlockedPhrase}>Add</Button>
                    </div>
                    {blockedPhrases.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {blockedPhrases.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                            <span className="text-sm">{item.phrase}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBlockedPhrase(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Ban Spam Accounts</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Automatically ban users posting more than 5 times per minute
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleBanSpammers}
                      disabled={spamChecking}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      {spamChecking ? 'Checking...' : 'Ban Spammers'}
                    </Button>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Cleanup Old Data</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Delete logs and views older than 30 days to free up space
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCleanupOldData}
                      disabled={spamChecking}
                    >
                      {spamChecking ? 'Cleaning...' : 'Cleanup Database'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle className="text-blue-600">Storage Management</CardTitle>
                <CardDescription>
                  Monitor and manage file storage usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-1">Storage Statistics</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      View current storage usage and file count
                    </div>
                    {storageStats && (
                      <div className="p-3 bg-secondary rounded-lg mb-3">
                        <div className="text-sm">
                          <div>Total Size: {(storageStats.totalSize / 1024 / 1024).toFixed(2)} MB</div>
                          <div>File Count: {storageStats.fileCount}</div>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={fetchStorageStats}
                      disabled={storageLoading}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      {storageLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HardDrive className="h-4 w-4 mr-2" />}
                      Check Storage
                    </Button>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Cleanup Old Files</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Delete storage files older than 30 days to free up space
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCleanupOldStorage}
                      disabled={storageLoading}
                    >
                      {storageLoading ? 'Cleaning...' : 'Cleanup Storage'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Delete All Notifications</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Permanently delete all notifications from the system
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllNotifications}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Notifications
                    </Button>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Sign Out All Users</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Immediately revoke all active user sessions (everyone will be logged out)
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleSignOutAllUsers}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sign Out All Users
                    </Button>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Delete All Follows</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Permanently delete all follow relationships between users
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllFollows}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Follows
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
