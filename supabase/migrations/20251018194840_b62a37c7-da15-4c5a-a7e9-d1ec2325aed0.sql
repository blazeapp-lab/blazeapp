-- Restore canonical triggers for counts and notifications, and ensure realtime on posts

-- 1) Ensure realtime publication includes posts (idempotent)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.posts';
  EXCEPTION WHEN duplicate_object THEN
    -- already added
    NULL;
  END;
END;
$$;

-- 2) Likes triggers (±1 and notify)
DROP TRIGGER IF EXISTS trg_posts_likes_count_ins ON public.likes;
DROP TRIGGER IF EXISTS trg_posts_likes_count_del ON public.likes;
DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;

CREATE TRIGGER trg_posts_likes_count_ins
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER trg_posts_likes_count_del
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER trg_notify_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_like();

-- 3) Broken hearts triggers (±1 and notify)
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_count_ins ON public.broken_hearts;
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_count_del ON public.broken_hearts;
DROP TRIGGER IF EXISTS trg_notify_broken_heart ON public.broken_hearts;

CREATE TRIGGER trg_posts_broken_hearts_count_ins
AFTER INSERT ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.update_post_broken_hearts_count();

CREATE TRIGGER trg_posts_broken_hearts_count_del
AFTER DELETE ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.update_post_broken_hearts_count();

CREATE TRIGGER trg_notify_broken_heart
AFTER INSERT ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.notify_broken_heart();

-- 4) Reposts triggers (±1 and notify)
DROP TRIGGER IF EXISTS trg_posts_reposts_count_ins ON public.reposts;
DROP TRIGGER IF EXISTS trg_posts_reposts_count_del ON public.reposts;
DROP TRIGGER IF EXISTS trg_notify_repost ON public.reposts;

CREATE TRIGGER trg_posts_reposts_count_ins
AFTER INSERT ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

CREATE TRIGGER trg_posts_reposts_count_del
AFTER DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

CREATE TRIGGER trg_notify_repost
AFTER INSERT ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.notify_repost();

-- 5) Comments triggers (±1, notify, updated_at)
DROP TRIGGER IF EXISTS trg_posts_comments_count_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_posts_comments_count_del ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;

CREATE TRIGGER trg_posts_comments_count_ins
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER trg_posts_comments_count_del
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER trg_notify_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Comment likes triggers (±1 and notify)
DROP TRIGGER IF EXISTS trg_comments_likes_count_ins ON public.comment_likes;
DROP TRIGGER IF EXISTS trg_comments_likes_count_del ON public.comment_likes;
DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.comment_likes;

CREATE TRIGGER trg_comments_likes_count_ins
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

CREATE TRIGGER trg_comments_likes_count_del
AFTER DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

CREATE TRIGGER trg_notify_comment_like
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_like();

-- 7) Posts updated_at trigger
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Post views count (keep single +1 on first view; UI can ignore)
DROP TRIGGER IF EXISTS trg_posts_views_count_ins ON public.post_views;
CREATE TRIGGER trg_posts_views_count_ins
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.update_post_views_count();
