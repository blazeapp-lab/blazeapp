-- Part 4: Rebuild all post counters from source tables to fix fake stats

-- Set bypass flag for all updates
DO $$
BEGIN
  PERFORM set_config('app.allow_counter_update', 'on', false);
  
  -- Rebuild likes_count
  UPDATE public.posts p
  SET likes_count = COALESCE(l.cnt, 0)
  FROM (SELECT post_id, COUNT(*) AS cnt FROM public.likes GROUP BY post_id) l
  WHERE p.id = l.post_id;
  
  UPDATE public.posts SET likes_count = 0 
  WHERE id NOT IN (SELECT DISTINCT post_id FROM public.likes);
  
  -- Rebuild broken_hearts_count
  UPDATE public.posts p
  SET broken_hearts_count = COALESCE(bh.cnt, 0)
  FROM (SELECT post_id, COUNT(*) AS cnt FROM public.broken_hearts GROUP BY post_id) bh
  WHERE p.id = bh.post_id;
  
  UPDATE public.posts SET broken_hearts_count = 0 
  WHERE id NOT IN (SELECT DISTINCT post_id FROM public.broken_hearts);
  
  -- Rebuild reposts_count
  UPDATE public.posts p
  SET reposts_count = COALESCE(r.cnt, 0)
  FROM (SELECT post_id, COUNT(*) AS cnt FROM public.reposts GROUP BY post_id) r
  WHERE p.id = r.post_id;
  
  UPDATE public.posts SET reposts_count = 0 
  WHERE id NOT IN (SELECT DISTINCT post_id FROM public.reposts);
  
  -- Rebuild comments_count
  UPDATE public.posts p
  SET comments_count = COALESCE(c.cnt, 0)
  FROM (SELECT post_id, COUNT(*) AS cnt FROM public.comments GROUP BY post_id) c
  WHERE p.id = c.post_id;
  
  UPDATE public.posts SET comments_count = 0 
  WHERE id NOT IN (SELECT DISTINCT post_id FROM public.comments);
  
  -- Rebuild views_count
  UPDATE public.posts p
  SET views_count = COALESCE(v.cnt, 0)
  FROM (SELECT post_id, COUNT(*) AS cnt FROM public.post_views GROUP BY post_id) v
  WHERE p.id = v.post_id;
  
  UPDATE public.posts SET views_count = 0 
  WHERE id NOT IN (SELECT DISTINCT post_id FROM public.post_views);
END $$;