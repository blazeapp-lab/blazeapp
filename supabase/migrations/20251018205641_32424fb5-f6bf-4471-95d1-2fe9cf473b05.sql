-- Directly update the corrupted post counter (avoid triggering update triggers)
UPDATE public.posts
SET 
  likes_count = COALESCE((SELECT COUNT(*) FROM public.likes WHERE post_id = posts.id), 0),
  broken_hearts_count = COALESCE((SELECT COUNT(*) FROM public.broken_hearts WHERE post_id = posts.id), 0),
  reposts_count = COALESCE((SELECT COUNT(*) FROM public.reposts WHERE post_id = posts.id), 0),
  comments_count = COALESCE((SELECT COUNT(*) FROM public.comments WHERE post_id = posts.id), 0)
WHERE id = 'dc6ae064-1e83-4b47-9ccb-dbfdcf3ce9a8';