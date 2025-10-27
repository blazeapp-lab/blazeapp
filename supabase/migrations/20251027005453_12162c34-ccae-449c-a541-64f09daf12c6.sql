-- Create function to revoke all user sessions by deleting refresh tokens
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all refresh tokens for the user
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
END;
$$;

-- Update the profile ban trigger to actually revoke sessions
CREATE OR REPLACE FUNCTION public.revoke_sessions_on_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is being banned, revoke all their sessions
  IF NEW.is_banned = true AND (OLD.is_banned IS NULL OR OLD.is_banned = false) THEN
    PERFORM public.revoke_user_sessions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for when users are suspended
CREATE OR REPLACE FUNCTION public.revoke_sessions_on_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Revoke all sessions when user is suspended
  PERFORM public.revoke_user_sessions(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger on user_suspensions table
DROP TRIGGER IF EXISTS on_user_suspended ON public.user_suspensions;
CREATE TRIGGER on_user_suspended
  AFTER INSERT ON public.user_suspensions
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_sessions_on_suspension();

-- Also revoke sessions when suspension is updated (if it becomes permanent or extended)
DROP TRIGGER IF EXISTS on_user_suspension_updated ON public.user_suspensions;
CREATE TRIGGER on_user_suspension_updated
  AFTER UPDATE ON public.user_suspensions
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_sessions_on_suspension();