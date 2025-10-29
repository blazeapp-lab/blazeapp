-- Fix the type mismatch in revoke_user_sessions function
-- The function accepts UUID but auth.refresh_tokens.user_id is VARCHAR
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Cast UUID to TEXT to match auth.refresh_tokens.user_id VARCHAR type
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::text;
END;
$$;