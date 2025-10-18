-- Attach triggers to keep post counters accurate and send notifications
-- Comments: maintain comments_count and notify post owner; update timestamps
DROP TRIGGER IF EXISTS comments_after_insert_count ON public.comments;
DROP TRIGGER IF EXISTS comments_after_delete_count ON public.comments;
DROP TRIGGER IF EXISTS comments_after_insert_notify ON public.comments;
DROP TRIGGER IF EXISTS comments_before_update_timestamp ON public.comments;

CREATE TRIGGER comments_after_insert_count
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER comments_after_delete_count
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER comments_after_insert_notify
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

CREATE TRIGGER comments_before_update_timestamp
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Likes: maintain likes_count and notify
DROP TRIGGER IF EXISTS likes_after_insert_count ON public.likes;
DROP TRIGGER IF EXISTS likes_after_delete_count ON public.likes;
DROP TRIGGER IF EXISTS likes_after_insert_notify ON public.likes;

CREATE TRIGGER likes_after_insert_count
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER likes_after_delete_count
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER likes_after_insert_notify
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_like();

-- Broken hearts: maintain counter and notify
DROP TRIGGER IF EXISTS broken_hearts_after_insert_count ON public.broken_hearts;
DROP TRIGGER IF EXISTS broken_hearts_after_delete_count ON public.broken_hearts;
DROP TRIGGER IF EXISTS broken_hearts_after_insert_notify ON public.broken_hearts;

CREATE TRIGGER broken_hearts_after_insert_count
AFTER INSERT ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.update_post_broken_hearts_count();

CREATE TRIGGER broken_hearts_after_delete_count
AFTER DELETE ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.update_post_broken_hearts_count();

CREATE TRIGGER broken_hearts_after_insert_notify
AFTER INSERT ON public.broken_hearts
FOR EACH ROW EXECUTE FUNCTION public.notify_broken_heart();

-- Reposts: maintain counter and notify
DROP TRIGGER IF EXISTS reposts_after_insert_count ON public.reposts;
DROP TRIGGER IF EXISTS reposts_after_delete_count ON public.reposts;
DROP TRIGGER IF EXISTS reposts_after_insert_notify ON public.reposts;

CREATE TRIGGER reposts_after_insert_count
AFTER INSERT ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

CREATE TRIGGER reposts_after_delete_count
AFTER DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.update_post_reposts_count();

CREATE TRIGGER reposts_after_insert_notify
AFTER INSERT ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.notify_repost();

-- Comment likes: maintain comment likes_count and notify
DROP TRIGGER IF EXISTS comment_likes_after_insert_count ON public.comment_likes;
DROP TRIGGER IF EXISTS comment_likes_after_delete_count ON public.comment_likes;
DROP TRIGGER IF EXISTS comment_likes_after_insert_notify ON public.comment_likes;

CREATE TRIGGER comment_likes_after_insert_count
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

CREATE TRIGGER comment_likes_after_delete_count
AFTER DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

CREATE TRIGGER comment_likes_after_insert_notify
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_like();

-- Post views: maintain views_count
DROP TRIGGER IF EXISTS post_views_after_insert_count ON public.post_views;
CREATE TRIGGER post_views_after_insert_count
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.update_post_views_count();

-- Follows: notify on new follow
DROP TRIGGER IF EXISTS follows_after_insert_notify ON public.follows;
CREATE TRIGGER follows_after_insert_notify
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

-- Update timestamps on posts and profiles
DROP TRIGGER IF EXISTS posts_before_update_timestamp ON public.posts;
DROP TRIGGER IF EXISTS profiles_before_update_timestamp ON public.profiles;

CREATE TRIGGER posts_before_update_timestamp
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER profiles_before_update_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();