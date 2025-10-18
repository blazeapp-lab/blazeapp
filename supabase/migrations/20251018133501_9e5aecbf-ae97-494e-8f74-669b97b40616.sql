-- Create function to notify followers when a user posts
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notifications for all followers
  INSERT INTO notifications (user_id, actor_id, type, post_id)
  SELECT 
    follows.follower_id,
    NEW.user_id,
    'new_post',
    NEW.id
  FROM follows
  WHERE follows.following_id = NEW.user_id
    AND follows.follower_id != NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to notify followers when a post is created
DROP TRIGGER IF EXISTS on_post_created_notify_followers ON posts;
CREATE TRIGGER on_post_created_notify_followers
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_on_post();