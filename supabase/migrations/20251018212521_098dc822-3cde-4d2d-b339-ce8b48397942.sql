-- First, fix any existing negative or invalid counter values
UPDATE public.posts
SET 
  likes_count = GREATEST(0, likes_count),
  comments_count = GREATEST(0, comments_count),
  broken_hearts_count = GREATEST(0, broken_hearts_count),
  reposts_count = GREATEST(0, reposts_count),
  views_count = GREATEST(0, views_count)
WHERE 
  likes_count < 0 
  OR comments_count < 0 
  OR broken_hearts_count < 0 
  OR reposts_count < 0 
  OR views_count < 0;

UPDATE public.comments
SET likes_count = GREATEST(0, likes_count)
WHERE likes_count < 0;

-- Now add CHECK constraints to prevent counter overflow and negative values
ALTER TABLE public.posts
ADD CONSTRAINT posts_likes_count_check CHECK (likes_count >= 0 AND likes_count <= 2147483647),
ADD CONSTRAINT posts_comments_count_check CHECK (comments_count >= 0 AND comments_count <= 2147483647),
ADD CONSTRAINT posts_broken_hearts_count_check CHECK (broken_hearts_count >= 0 AND broken_hearts_count <= 2147483647),
ADD CONSTRAINT posts_reposts_count_check CHECK (reposts_count >= 0 AND reposts_count <= 2147483647),
ADD CONSTRAINT posts_views_count_check CHECK (views_count >= 0 AND views_count <= 2147483647);

ALTER TABLE public.comments
ADD CONSTRAINT comments_likes_count_check CHECK (likes_count >= 0 AND likes_count <= 2147483647);