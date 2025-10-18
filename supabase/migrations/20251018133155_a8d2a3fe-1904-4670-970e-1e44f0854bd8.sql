-- Add tags notification setting to notification_settings
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS tags boolean DEFAULT true;

-- Update should_notify function to handle tags
CREATE OR REPLACE FUNCTION public.should_notify(recipient_id uuid, notification_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_exists BOOLEAN;
  notify_enabled BOOLEAN;
BEGIN
  -- Check if settings exist
  SELECT EXISTS(SELECT 1 FROM notification_settings WHERE user_id = recipient_id) INTO settings_exists;
  
  -- If no settings, default to true
  IF NOT settings_exists THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific notification type
  EXECUTE format('SELECT %I FROM notification_settings WHERE user_id = $1', notification_type)
  INTO notify_enabled
  USING recipient_id;
  
  RETURN COALESCE(notify_enabled, TRUE);
END;
$$;

-- Create function to notify tagged users
CREATE OR REPLACE FUNCTION public.notify_tagged_users(post_id_param uuid, tagged_usernames text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tagged_user_id uuid;
  post_author_id uuid;
  username text;
BEGIN
  -- Get post author
  SELECT user_id INTO post_author_id FROM posts WHERE id = post_id_param;
  
  -- Loop through tagged usernames
  FOREACH username IN ARRAY tagged_usernames
  LOOP
    -- Find user by username (case insensitive)
    SELECT id INTO tagged_user_id 
    FROM profiles 
    WHERE LOWER(profiles.username) = LOWER(username)
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
$$;