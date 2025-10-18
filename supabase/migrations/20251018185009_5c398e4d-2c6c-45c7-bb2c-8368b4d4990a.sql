-- Ensure full row data for realtime updates
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_posts_likes_count ON public.likes;
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_count ON public.broken_hearts;
DROP TRIGGER IF EXISTS trg_posts_reposts_count ON public.reposts;
DROP TRIGGER IF EXISTS trg_posts_views_count ON public.post_views;
DROP TRIGGER IF EXISTS trg_posts_comments_count ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
DROP TRIGGER IF EXISTS trg_notify_broken_heart ON public.broken_hearts;
DROP TRIGGER IF EXISTS trg_notify_repost ON public.reposts;
DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
DROP TRIGGER IF EXISTS update_comment_likes_count ON public.comment_likes;

-- Create triggers for counter updates
CREATE TRIGGER trg_posts_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER trg_posts_broken_hearts_count
AFTER INSERT OR DELETE ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_broken_hearts_count();

CREATE TRIGGER trg_posts_reposts_count
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.update_post_reposts_count();

CREATE TRIGGER trg_posts_views_count
AFTER INSERT ON public.post_views
FOR EACH ROW
EXECUTE FUNCTION public.update_post_views_count();

CREATE TRIGGER trg_posts_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

-- Create triggers for notifications
CREATE TRIGGER trg_notify_like
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_like();

CREATE TRIGGER trg_notify_broken_heart
AFTER INSERT ON public.broken_hearts
FOR EACH ROW
EXECUTE FUNCTION public.notify_broken_heart();

CREATE TRIGGER trg_notify_repost
AFTER INSERT ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.notify_repost();

CREATE TRIGGER trg_notify_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment();

CREATE TRIGGER trg_notify_comment_like
AFTER INSERT ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_like();

CREATE TRIGGER trg_notify_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_follow();

-- Create trigger for updated_at columns
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comment_likes_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_likes_count();