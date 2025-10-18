-- Reset all comment likes counters to match actual data
UPDATE public.comments c
SET likes_count = (SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = c.id);