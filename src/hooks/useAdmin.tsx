import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
      }

      if (roles && roles.length > 0) {
        setIsAdmin(roles.some(r => r.role === 'admin'));
        setIsModerator(roles.some(r => r.role === 'moderator'));
      }
      
      setLoading(false);
    };

    checkRole();
  }, [user]);

  return { isAdmin, isModerator, loading };
};
