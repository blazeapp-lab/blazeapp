-- Part 1: Guard post counters and immutable fields from manual updates

-- Function to prevent unauthorized counter/immutable field updates
CREATE OR REPLACE FUNCTION public.guard_post_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Block changes to immutable fields
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable post fields';
  END IF;

  -- Block counter changes unless system trigger sets bypass flag
  IF (NEW.likes_count IS DISTINCT FROM OLD.likes_count OR NEW.broken_hearts_count IS DISTINCT FROM OLD.broken_hearts_count 
      OR NEW.reposts_count IS DISTINCT FROM OLD.reposts_count OR NEW.comments_count IS DISTINCT FROM OLD.comments_count 
      OR NEW.views_count IS DISTINCT FROM OLD.views_count) THEN
    IF current_setting('app.allow_counter_update', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Post counters are managed automatically';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the guard
DROP TRIGGER IF EXISTS guard_post_updates ON public.posts;
CREATE TRIGGER guard_post_updates
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.guard_post_updates();

-- Zero out counters on new post creation
CREATE OR REPLACE FUNCTION public.reset_post_counters_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.likes_count := 0;
  NEW.broken_hearts_count := 0;
  NEW.reposts_count := 0;
  NEW.comments_count := 0;
  NEW.views_count := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_post_counters_on_insert ON public.posts;
CREATE TRIGGER reset_post_counters_on_insert
BEFORE INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.reset_post_counters_on_insert();