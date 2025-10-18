-- Remove quoted_post_id column from posts table
ALTER TABLE public.posts DROP COLUMN IF EXISTS quoted_post_id;