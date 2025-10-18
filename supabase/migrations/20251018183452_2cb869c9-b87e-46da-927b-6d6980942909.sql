-- Ensure full row data for realtime updates
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- updated_at triggers
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Counter triggers
DROP TRIGGER IF EXISTS trg_posts_likes_count ON public.likes;
CREATE TRIGGER trg_posts_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

DROP TRIGGER IF EXISTS trg_posts_broken_hearts_count ON public.broken_hearts;
CREATE TRIGGER trg_posts_broken_hearts_count
AFTER INSERT OR DELETE ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_broken_hearts_count();

DROP TRIGGER IF EXISTS trg_posts_reposts_count ON public.reposts;
CREATE TRIGGER trg_posts_reposts_count
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_reposts_count();

DROP TRIGGER IF EXISTS trg_posts_views_count ON public.post_views;
CREATE TRIGGER trg_posts_views_count
AFTER INSERT ON public.post_views
FOR EACH ROW
EXECUTE FUNCTION public.update_post_views_count();

DROP TRIGGER IF EXISTS trg_posts_comments_count ON public.comments;
CREATE TRIGGER trg_posts_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

-- Notification triggers
DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
CREATE TRIGGER trg_notify_like
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_like();

DROP TRIGGER IF EXISTS trg_notify_broken_heart ON public.broken_hearts;
CREATE TRIGGER trg_notify_broken_heart
AFTER INSERT ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.notify_broken_heart();

DROP TRIGGER IF EXISTS trg_notify_repost ON public.reposts;
CREATE TRIGGER trg_notify_repost
AFTER INSERT ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.notify_repost();

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment();

DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notify_comment_like
AFTER INSERT ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_like();