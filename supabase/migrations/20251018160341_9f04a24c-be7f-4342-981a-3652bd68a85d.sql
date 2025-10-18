-- Fix ambiguous column reference in notify_tagged_users function
CREATE OR REPLACE FUNCTION public.notify_tagged_users(post_id_param uuid, tagged_usernames text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tagged_user_id uuid;
  post_author_id uuid;
  current_username text;
BEGIN
  -- Get post author
  SELECT user_id INTO post_author_id FROM posts WHERE id = post_id_param;
  
  -- Loop through tagged usernames
  FOREACH current_username IN ARRAY tagged_usernames
  LOOP
    -- Find user by username (case insensitive)
    SELECT id INTO tagged_user_id 
    FROM profiles 
    WHERE LOWER(profiles.username) = LOWER(current_username)
    LIMIT 1;
    
    -- If user exists and is not the post author, create notification
    IF tagged_user_id IS NOT NULL AND tagged_user_id != post_author_id THEN
      -- Check if user wants tag notifications
      IF should_notify(tagged_user_id, 'tags') THEN
        INSERT INTO notifications (user_id, actor_id, type, post_id)
        VALUES (tagged_user_id, post_author_id, 'tag', post_id_param)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$function$;