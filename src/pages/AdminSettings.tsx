import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

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

  if (adminLoading || !isAdmin || loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-8 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">App Settings</h1>
          </div>

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
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
