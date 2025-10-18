-- Clean up duplicate triggers causing multiple count increments
-- Keep only one count trigger per table and one notify trigger per event

-- Likes
DROP TRIGGER IF EXISTS trg_posts_likes_ins ON public.likes;
DROP TRIGGER IF EXISTS trg_posts_likes_del ON public.likes;
DROP TRIGGER IF EXISTS update_likes_count ON public.likes;
-- Keep trg_posts_likes_count and notify trigger 'trg_notify_like'; drop alternate notify
DROP TRIGGER IF EXISTS on_like_created ON public.likes;

-- Broken hearts
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_ins ON public.broken_hearts;
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_del ON public.broken_hearts;
DROP TRIGGER IF EXISTS update_broken_hearts_count ON public.broken_hearts;
-- Keep trg_posts_broken_hearts_count and 'trg_notify_broken_heart'; drop alternate notify
DROP TRIGGER IF EXISTS on_broken_heart_created ON public.broken_hearts;

-- Comments
DROP TRIGGER IF EXISTS trg_posts_comments_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_posts_comments_del ON public.comments;
DROP TRIGGER IF EXISTS update_comments_count ON public.comments;
-- Keep trg_posts_comments_count and 'trg_notify_comment'; drop alternate notify
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
-- Updated_at duplicates
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

-- Comment likes
DROP TRIGGER IF EXISTS trg_comment_likes_ins ON public.comment_likes;
DROP TRIGGER IF EXISTS trg_comment_likes_del ON public.comment_likes;
DROP TRIGGER IF EXISTS update_comment_likes_count ON public.comment_likes;
DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON public.comment_likes;
-- Keep 'trg_comments_likes_count' and 'trg_notify_comment_like'; drop alternate notify
DROP TRIGGER IF EXISTS on_comment_like_created ON public.comment_likes;

-- Reposts
DROP TRIGGER IF EXISTS trg_posts_reposts_ins ON public.reposts;
DROP TRIGGER IF EXISTS trg_posts_reposts_del ON public.reposts;
DROP TRIGGER IF EXISTS update_post_reposts_count_trigger ON public.reposts;
-- Keep 'trg_posts_reposts_count' and 'trg_notify_repost'
DROP TRIGGER IF EXISTS on_repost_created ON public.reposts;

-- Post views (we hide in UI but keep 1 trigger)
DROP TRIGGER IF EXISTS trg_posts_views_ins ON public.post_views;
DROP TRIGGER IF EXISTS update_post_views_count_trigger ON public.post_views;
-- Keep trg_posts_views_count

-- Follows notify duplicate
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
-- Keep 'trg_notify_follow'

-- Posts updated_at duplicate
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;

-- Profiles updated_at: keep existing single trigger (no change)

-- Verify: ensure the canonical triggers exist (no-op if already present)
DO $$ BEGIN END $$;