-- Part 2: Update counter trigger functions to use bypass flag

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_counter_update', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_broken_hearts_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_counter_update', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET broken_hearts_count = broken_hearts_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET broken_hearts_count = GREATEST(0, broken_hearts_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_reposts_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_counter_update', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_counter_update', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_views_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_counter_update', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;