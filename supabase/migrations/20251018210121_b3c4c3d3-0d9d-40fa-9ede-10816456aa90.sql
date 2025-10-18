-- Add unique constraints to prevent duplicate likes/reactions/reposts at database level
-- This ensures data integrity even if multiple requests somehow get through

-- Unique constraint on likes (one like per user per post)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_post_unique'
  ) THEN
    ALTER TABLE public.likes 
    ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

-- Unique constraint on broken_hearts (one broken heart per user per post)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broken_hearts_user_post_unique'
  ) THEN
    ALTER TABLE public.broken_hearts 
    ADD CONSTRAINT broken_hearts_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

-- Unique constraint on reposts (one repost per user per post)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reposts_user_post_unique'
  ) THEN
    ALTER TABLE public.reposts 
    ADD CONSTRAINT reposts_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

-- Unique constraint on comment_likes (one like per user per comment)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_likes_user_comment_unique'
  ) THEN
    ALTER TABLE public.comment_likes 
    ADD CONSTRAINT comment_likes_user_comment_unique UNIQUE (user_id, comment_id);
  END IF;
END $$;