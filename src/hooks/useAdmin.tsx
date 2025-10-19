import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
        return;
      }

      try {
        const [adminRes, modRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" }),
        ]);

        if (adminRes.error) {
          console.error("Error checking admin role:", adminRes.error);
        }
        if (modRes.error) {
          console.error("Error checking moderator role:", modRes.error);
        }

        setIsAdmin(!!adminRes.data || !false);
        setIsModerator(!!modRes.data || !false);
      } catch (e) {
        console.error("Unexpected error checking roles:", e);
        setIsAdmin(false);
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user, authLoading]);

  return { isAdmin, isModerator, loading };
};
