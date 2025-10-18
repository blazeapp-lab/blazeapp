-- Ensure full row data in realtime updates
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- Keep updated_at in sync
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

-- Likes -> posts.likes_count and notifications
DROP TRIGGER IF EXISTS trg_posts_likes_count ON public.likes;
CREATE TRIGGER trg_posts_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
CREATE TRIGGER trg_notify_like
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_like();

-- Broken hearts -> posts.broken_hearts_count and notifications
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_count ON public.broken_hearts;
CREATE TRIGGER trg_posts_broken_hearts_count
AFTER INSERT OR DELETE ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_broken_hearts_count();

DROP TRIGGER IF EXISTS trg_notify_broken_heart ON public.broken_hearts;
CREATE TRIGGER trg_notify_broken_heart
AFTER INSERT ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.notify_broken_heart();

-- Reposts -> posts.reposts_count and notifications
DROP TRIGGER IF EXISTS trg_posts_reposts_count ON public.reposts;
CREATE TRIGGER trg_posts_reposts_count
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_reposts_count();

DROP TRIGGER IF EXISTS trg_notify_repost ON public.reposts;
CREATE TRIGGER trg_notify_repost
AFTER INSERT ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.notify_repost();

-- Post views -> posts.views_count
DROP TRIGGER IF EXISTS trg_posts_views_count ON public.post_views;
CREATE TRIGGER trg_posts_views_count
AFTER INSERT ON public.post_views
FOR EACH ROW
EXECUTE FUNCTION public.update_post_views_count();

-- Comments -> posts.comments_count and notifications
DROP TRIGGER IF EXISTS trg_posts_comments_count ON public.comments;
CREATE TRIGGER trg_posts_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment();

-- Comment likes -> comments.likes_count and notifications
DROP TRIGGER IF EXISTS trg_comments_likes_count ON public.comment_likes;
CREATE TRIGGER trg_comments_likes_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_likes_count();

DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notify_comment_like
AFTER INSERT ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_like();