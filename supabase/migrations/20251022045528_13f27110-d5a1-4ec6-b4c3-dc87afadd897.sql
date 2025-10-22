-- Add CASCADE deletion for post-related tables so deleting a post works properly

-- Drop existing foreign keys and recreate with ON DELETE CASCADE

-- 1. Likes table
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
ALTER TABLE public.likes 
  ADD CONSTRAINT likes_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES public.posts(id) 
  ON DELETE CASCADE;

-- 2. Comments table
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
ALTER TABLE public.comments 
  ADD CONSTRAINT comments_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES public.posts(id) 
  ON DELETE CASCADE;

-- 3. Broken hearts table
ALTER TABLE public.broken_hearts DROP CONSTRAINT IF EXISTS broken_hearts_post_id_fkey;
ALTER TABLE public.broken_hearts 
  ADD CONSTRAINT broken_hearts_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES public.posts(id) 
  ON DELETE CASCADE;

-- 4. Reposts table
ALTER TABLE public.reposts DROP CONSTRAINT IF EXISTS reposts_post_id_fkey;
ALTER TABLE public.reposts 
  ADD CONSTRAINT reposts_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES public.posts(id) 
  ON DELETE CASCADE;

-- 5. Post views table
ALTER TABLE public.post_views DROP CONSTRAINT IF EXISTS post_views_post_id_fkey;
ALTER TABLE public.post_views 
  ADD CONSTRAINT post_views_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES public.posts(id) 
  ON DELETE CASCADE;

-- 6. Notifications table (post_id is nullable, so handle gracefully)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_post_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES public.posts(id) 
  ON DELETE CASCADE;