-- Use TRUNCATE to efficiently delete all data and reset sequences
-- TRUNCATE CASCADE will handle foreign key relationships
TRUNCATE TABLE public.posts, public.comments, public.likes, public.reposts, public.broken_hearts, public.comment_likes, public.post_views CASCADE;

-- Clean up related notifications
DELETE FROM public.notifications WHERE post_id IS NOT NULL OR comment_id IS NOT NULL;