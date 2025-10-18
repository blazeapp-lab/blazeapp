-- Add quoted_post_id column to posts table to support quote posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS quoted_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;