-- Strengthen anti-spam protections across comments, likes, reposts and follows
-- 1) Update comment cooldown to also block banned/suspended users
CREATE OR REPLACE FUNCTION public.enforce_comment_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_comment_count INTEGER;
  user_banned BOOLEAN;
BEGIN
  -- Block banned or suspended users
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
  IF user_banned OR public.is_user_suspended(NEW.user_id) THEN
    RAISE EXCEPTION 'Your account has been banned for suspicious activity';
  END IF;

  -- Check comments in last minute (spam detection)
  SELECT COUNT(*) INTO recent_comment_count FROM public.comments
  WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Limit to 10 comments per minute
  IF recent_comment_count >= 10 THEN
    RAISE EXCEPTION 'You are commenting too fast. Maximum 10 comments per minute. Try again in a moment.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (drop old if present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'comment_rate_limit_trigger') THEN
    DROP TRIGGER comment_rate_limit_trigger ON public.comments;
  END IF;
END $$;
CREATE TRIGGER comment_rate_limit_trigger
BEFORE INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_cooldown();

-- 2) Repost cooldown and ban thresholds
CREATE OR REPLACE FUNCTION public.enforce_repost_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_repost_count INTEGER;
  user_banned BOOLEAN;
BEGIN
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
  IF user_banned OR public.is_user_suspended(NEW.user_id) THEN
    RAISE EXCEPTION 'Your account has been banned for suspicious activity';
  END IF;

  SELECT COUNT(*) INTO recent_repost_count FROM public.reposts
  WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 minute';

  -- Soft limit
  IF recent_repost_count >= 10 THEN
    RAISE EXCEPTION 'You are reposting too fast. Maximum 10 reposts per minute.';
  END IF;

  -- Auto-ban for extreme abuse
  IF recent_repost_count >= 30 THEN
    UPDATE public.profiles SET is_banned = true WHERE id = NEW.user_id;
    RAISE EXCEPTION 'Account automatically banned for repost spam. Contact admin.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reposts_rate_limit_trigger') THEN
    DROP TRIGGER reposts_rate_limit_trigger ON public.reposts;
  END IF;
END $$;
CREATE TRIGGER reposts_rate_limit_trigger
BEFORE INSERT ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.enforce_repost_cooldown();

-- 3) Likes cooldown
CREATE OR REPLACE FUNCTION public.enforce_like_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_like_count INTEGER;
  user_banned BOOLEAN;
BEGIN
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
  IF user_banned OR public.is_user_suspended(NEW.user_id) THEN
    RAISE EXCEPTION 'Your account has been banned for suspicious activity';
  END IF;

  SELECT COUNT(*) INTO recent_like_count FROM public.likes
  WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_like_count >= 60 THEN
    RAISE EXCEPTION 'You are liking too fast. Maximum 60 likes per minute.';
  END IF;

  IF recent_like_count >= 300 THEN
    UPDATE public.profiles SET is_banned = true WHERE id = NEW.user_id;
    RAISE EXCEPTION 'Account automatically banned for like spam. Contact admin.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'likes_rate_limit_trigger') THEN
    DROP TRIGGER likes_rate_limit_trigger ON public.likes;
  END IF;
END $$;
CREATE TRIGGER likes_rate_limit_trigger
BEFORE INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.enforce_like_cooldown();

-- 4) Comment likes cooldown
CREATE OR REPLACE FUNCTION public.enforce_comment_like_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_like_count INTEGER;
  user_banned BOOLEAN;
BEGIN
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
  IF user_banned OR public.is_user_suspended(NEW.user_id) THEN
    RAISE EXCEPTION 'Your account has been banned for suspicious activity';
  END IF;

  SELECT COUNT(*) INTO recent_like_count FROM public.comment_likes
  WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_like_count >= 60 THEN
    RAISE EXCEPTION 'You are liking comments too fast. Maximum 60 per minute.';
  END IF;

  IF recent_like_count >= 300 THEN
    UPDATE public.profiles SET is_banned = true WHERE id = NEW.user_id;
    RAISE EXCEPTION 'Account automatically banned for comment-like spam. Contact admin.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'comment_likes_rate_limit_trigger') THEN
    DROP TRIGGER comment_likes_rate_limit_trigger ON public.comment_likes;
  END IF;
END $$;
CREATE TRIGGER comment_likes_rate_limit_trigger
BEFORE INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_like_cooldown();

-- 5) Follows cooldown
CREATE OR REPLACE FUNCTION public.enforce_follow_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_follow_count INTEGER;
  user_banned BOOLEAN;
BEGIN
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.follower_id;
  IF user_banned OR public.is_user_suspended(NEW.follower_id) THEN
    RAISE EXCEPTION 'Your account has been banned for suspicious activity';
  END IF;

  SELECT COUNT(*) INTO recent_follow_count FROM public.follows
  WHERE follower_id = NEW.follower_id AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_follow_count >= 30 THEN
    RAISE EXCEPTION 'You are following too fast. Maximum 30 follows per minute.';
  END IF;

  IF recent_follow_count >= 100 THEN
    UPDATE public.profiles SET is_banned = true WHERE id = NEW.follower_id;
    RAISE EXCEPTION 'Account automatically banned for follow spam. Contact admin.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'follows_rate_limit_trigger') THEN
    DROP TRIGGER follows_rate_limit_trigger ON public.follows;
  END IF;
END $$;
CREATE TRIGGER follows_rate_limit_trigger
BEFORE INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.enforce_follow_cooldown();

-- 6) Helpful indexes for rate checks
CREATE INDEX IF NOT EXISTS idx_comments_user_created_at ON public.comments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user_created_at ON public.likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_created_at ON public.comment_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reposts_user_created_at ON public.reposts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_created_at ON public.follows (follower_id, created_at DESC);
