-- Create triggers to maintain aggregate counts on posts and comments
-- Likes -> posts.likes_count
DROP TRIGGER IF EXISTS trg_posts_likes_ins ON public.likes;
CREATE TRIGGER trg_posts_likes_ins
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

DROP TRIGGER IF EXISTS trg_posts_likes_del ON public.likes;
CREATE TRIGGER trg_posts_likes_del
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Broken hearts -> posts.broken_hearts_count
DROP TRIGGER IF EXISTS trg_posts_broken_hearts_ins ON public.broken_hearts;
CREATE TRIGGER trg_posts_broken_hearts_ins
AFTER INSERT ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.update_post_broken_hearts_count();

DROP TRIGGER IF EXISTS trg_posts_broken_hearts_del ON public.broken_hearts;
CREATE TRIGGER trg_posts_broken_hearts_del
AFTER DELETE ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.update_post_broken_hearts_count();

-- Reposts -> posts.reposts_count
DROP TRIGGER IF EXISTS trg_posts_reposts_ins ON public.reposts;
CREATE TRIGGER trg_posts_reposts_ins
AFTER INSERT ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

DROP TRIGGER IF EXISTS trg_posts_reposts_del ON public.reposts;
CREATE TRIGGER trg_posts_reposts_del
AFTER DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

-- Comments -> posts.comments_count
DROP TRIGGER IF EXISTS trg_posts_comments_ins ON public.comments;
CREATE TRIGGER trg_posts_comments_ins
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

DROP TRIGGER IF EXISTS trg_posts_comments_del ON public.comments;
CREATE TRIGGER trg_posts_comments_del
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Comment likes -> comments.likes_count
DROP TRIGGER IF EXISTS trg_comment_likes_ins ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_ins
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

DROP TRIGGER IF EXISTS trg_comment_likes_del ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_del
AFTER DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;
CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Views -> posts.views_count (safe even if not displayed)
DROP TRIGGER IF EXISTS trg_posts_views_ins ON public.post_views;
CREATE TRIGGER trg_posts_views_ins
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.update_post_views_count();