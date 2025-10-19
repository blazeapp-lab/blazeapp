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

  // Monitor for suspensions in real-time
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-suspension-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_suspensions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload: any) => {
          const suspension = payload.new;
          
          // Sign out the user
          await supabase.auth.signOut();
          
          // Show suspension message
          if (suspension.is_permanent) {
            toast.error(`Your account has been permanently suspended.\n\nReason: ${suspension.reason || 'No reason provided'}`, {
              duration: 10000
            });
          } else if (suspension.expires_at) {
            const expiryDate = new Date(suspension.expires_at);
            const now = new Date();
            const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            toast.error(`Your account has been suspended until ${expiryDate.toLocaleDateString()}.\n\nReason: ${suspension.reason || 'No reason provided'}\n\nTime remaining: ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, {
              duration: 10000
            });
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
