-- Add likes_count to comments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE public.comments ADD COLUMN likes_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone"
ON public.comment_likes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments"
ON public.comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments"
ON public.comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create reposts table
CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON public.reposts;
CREATE POLICY "Reposts are viewable by everyone"
ON public.reposts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create reposts" ON public.reposts;
CREATE POLICY "Users can create reposts"
ON public.reposts FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their reposts" ON public.reposts;
CREATE POLICY "Users can delete their reposts"
ON public.reposts FOR DELETE
USING (auth.uid() = user_id);

-- Add reposts_count and views_count to posts if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'reposts_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN reposts_count integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN views_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create post_views table for tracking unique views
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post views are viewable by everyone" ON public.post_views;
CREATE POLICY "Post views are viewable by everyone"
ON public.post_views FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can create post views" ON public.post_views;
CREATE POLICY "Anyone can create post views"
ON public.post_views FOR INSERT
WITH CHECK (true);

-- Create trigger function for comment likes count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET likes_count = likes_count - 1
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON public.comment_likes;
CREATE TRIGGER update_comment_likes_count_trigger
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

-- Create trigger function for reposts count
CREATE OR REPLACE FUNCTION public.update_post_reposts_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET reposts_count = reposts_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET reposts_count = reposts_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_post_reposts_count_trigger ON public.reposts;
CREATE TRIGGER update_post_reposts_count_trigger
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

-- Create trigger function for views count
CREATE OR REPLACE FUNCTION public.update_post_views_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET views_count = views_count + 1
    WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_post_views_count_trigger ON public.post_views;
CREATE TRIGGER update_post_views_count_trigger
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.update_post_views_count();