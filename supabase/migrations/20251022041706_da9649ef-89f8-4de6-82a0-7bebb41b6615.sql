-- Add comment rate limiting trigger
CREATE OR REPLACE FUNCTION public.enforce_comment_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_comment_count INTEGER;
BEGIN
  -- Check comments in last minute (spam detection)
  SELECT COUNT(*) INTO recent_comment_count FROM public.comments
  WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Limit to 10 comments per minute
  IF recent_comment_count >= 10 THEN
    RAISE EXCEPTION 'You are commenting too fast. Maximum 10 comments per minute. Try again in a moment.';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for comment rate limiting
DROP TRIGGER IF EXISTS comment_rate_limit_trigger ON public.comments;
CREATE TRIGGER comment_rate_limit_trigger
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comment_cooldown();