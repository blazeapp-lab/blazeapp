import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Monitor for bans/suspensions in real-time and enforce immediately
  useEffect(() => {
    if (!user?.id) return;

    const checkAndEnforce = async () => {
      // 1) Ban check
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        toast.error('Your account has been banned for suspicious activity.', { duration: 10000 });
        return true;
      }

      // 2) Active suspension check
      const { data: suspension } = await supabase
        .from('user_suspensions')
        .select('reason, is_permanent, expires_at')
        .eq('user_id', user.id)
        .order('suspended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (suspension && (suspension.is_permanent || !suspension.expires_at || new Date(suspension.expires_at) > new Date())) {
        await supabase.auth.signOut();
        if (suspension.is_permanent) {
          toast.error(`Your account has been permanently suspended.\n\nReason: ${suspension.reason || 'No reason provided'}`, { duration: 10000 });
        } else if (suspension.expires_at) {
          const expiryDate = new Date(suspension.expires_at);
          const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          toast.error(`Your account has been suspended until ${expiryDate.toLocaleDateString()}.\n\nReason: ${suspension.reason || 'No reason provided'}\n\nTime remaining: ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            { duration: 10000 });
        } else {
          toast.error('Your account has been suspended.', { duration: 10000 });
        }
        return true;
      }
      return false;
    };

    // Enforce immediately on login
    checkAndEnforce();

    // Realtime enforcement for future changes
    const channel = supabase
      .channel('user-access-guard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_suspensions', filter: `user_id=eq.${user.id}` },
        async () => {
          await checkAndEnforce();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload: any) => {
          if (payload.new?.is_banned) {
            await supabase.auth.signOut();
            toast.error('Your account has been banned for suspicious activity.', { duration: 10000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
