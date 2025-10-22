-- Fix comment-related cascades only (skip content_reports polymorphic FK)

-- Comment-related foreign key for parent comment (nested comments)
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_parent_comment_id_fkey;
ALTER TABLE public.comments 
  ADD CONSTRAINT comments_parent_comment_id_fkey 
  FOREIGN KEY (parent_comment_id) 
  REFERENCES public.comments(id) 
  ON DELETE CASCADE;

-- Comment likes should cascade when comment is deleted
ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_comment_id_fkey;
ALTER TABLE public.comment_likes 
  ADD CONSTRAINT comment_likes_comment_id_fkey 
  FOREIGN KEY (comment_id) 
  REFERENCES public.comments(id) 
  ON DELETE CASCADE;

-- Notifications should cascade when comment is deleted
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_comment_id_fkey;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_comment_id_fkey 
  FOREIGN KEY (comment_id) 
  REFERENCES public.comments(id) 
  ON DELETE CASCADE;

-- Clean up orphaned content_reports (reports referencing deleted posts)
DELETE FROM public.content_reports 
WHERE content_type = 'post' 
  AND NOT EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = content_reports.content_id
  );

-- Clean up orphaned content_reports (reports referencing deleted comments)
DELETE FROM public.content_reports 
WHERE content_type = 'comment' 
  AND NOT EXISTS (
    SELECT 1 FROM public.comments WHERE comments.id = content_reports.content_id
  );