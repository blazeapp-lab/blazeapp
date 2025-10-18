-- Reset all post counters to match actual data
UPDATE public.posts p
SET 
  likes_count = (SELECT COUNT(*) FROM public.likes WHERE post_id = p.id),
  broken_hearts_count = (SELECT COUNT(*) FROM public.broken_hearts WHERE post_id = p.id),
  reposts_count = (SELECT COUNT(*) FROM public.reposts WHERE post_id = p.id),
  comments_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = p.id),
  views_count = (SELECT COUNT(*) FROM public.post_views WHERE post_id = p.id);