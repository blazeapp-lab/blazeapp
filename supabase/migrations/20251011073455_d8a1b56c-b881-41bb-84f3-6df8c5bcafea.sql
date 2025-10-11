-- Create follows table
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS on follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for follows
CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Create broken_hearts table (like dislikes)
CREATE TABLE public.broken_hearts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on broken_hearts
ALTER TABLE public.broken_hearts ENABLE ROW LEVEL SECURITY;

-- RLS policies for broken_hearts
CREATE POLICY "Broken hearts are viewable by everyone"
  ON public.broken_hearts FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own broken hearts"
  ON public.broken_hearts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own broken hearts"
  ON public.broken_hearts FOR DELETE
  USING (auth.uid() = user_id);

-- Add broken_hearts_count to posts
ALTER TABLE public.posts ADD COLUMN broken_hearts_count INTEGER NOT NULL DEFAULT 0;

-- Create trigger function for broken_hearts count
CREATE OR REPLACE FUNCTION public.update_post_broken_hearts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET broken_hearts_count = broken_hearts_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET broken_hearts_count = broken_hearts_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for broken_hearts
CREATE TRIGGER update_broken_hearts_count
AFTER INSERT OR DELETE ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_broken_hearts_count();