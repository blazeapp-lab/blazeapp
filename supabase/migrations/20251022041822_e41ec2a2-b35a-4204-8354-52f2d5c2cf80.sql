-- Create admin function to revoke all user sessions
CREATE OR REPLACE FUNCTION public.admin_revoke_all_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_count INTEGER := 0;
BEGIN
  -- Ensure only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke all sessions';
  END IF;

  -- Delete all refresh tokens (this effectively signs everyone out)
  DELETE FROM auth.refresh_tokens;
  
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'sessions_revoked', result_count
  );
END;
$function$;