-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'repost', 'broken_heart', 'comment_like')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  likes BOOLEAN DEFAULT TRUE,
  comments BOOLEAN DEFAULT TRUE,
  follows BOOLEAN DEFAULT TRUE,
  reposts BOOLEAN DEFAULT TRUE,
  broken_hearts BOOLEAN DEFAULT TRUE,
  comment_likes BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Notification settings policies
CREATE POLICY "Users can view their own settings"
ON public.notification_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to check notification settings
CREATE OR REPLACE FUNCTION public.should_notify(recipient_id UUID, notification_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  recipient_id UUID,
  actor_id UUID,
  notif_type TEXT,
  post_id UUID DEFAULT NULL,
  comment_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't notify if actor is the recipient
  IF actor_id = recipient_id THEN
    RETURN;
  END IF;
  
  -- Check if user wants this type of notification
  IF NOT should_notify(recipient_id, notif_type || 's') THEN
    RETURN;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
  VALUES (recipient_id, actor_id, notif_type, post_id, comment_id);
END;
$$;

-- Trigger for like notifications
CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  PERFORM create_notification(post_owner_id, NEW.user_id, 'like', NEW.post_id, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_like();

-- Trigger for comment notifications
CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  PERFORM create_notification(post_owner_id, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment();

-- Trigger for follow notifications
CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_notification(NEW.following_id, NEW.follower_id, 'follow', NULL, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_follow();

-- Trigger for repost notifications
CREATE OR REPLACE FUNCTION public.notify_repost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  PERFORM create_notification(post_owner_id, NEW.user_id, 'repost', NEW.post_id, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_repost_created
  AFTER INSERT ON public.reposts
  FOR EACH ROW
  EXECUTE FUNCTION notify_repost();

-- Trigger for broken heart notifications
CREATE OR REPLACE FUNCTION public.notify_broken_heart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  PERFORM create_notification(post_owner_id, NEW.user_id, 'broken_heart', NEW.post_id, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_broken_heart_created
  AFTER INSERT ON public.broken_hearts
  FOR EACH ROW
  EXECUTE FUNCTION notify_broken_heart();

-- Trigger for comment like notifications
CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_owner_id UUID;
  comment_post_id UUID;
BEGIN
  SELECT user_id, post_id INTO comment_owner_id, comment_post_id FROM comments WHERE id = NEW.comment_id;
  PERFORM create_notification(comment_owner_id, NEW.user_id, 'comment_like', comment_post_id, NEW.comment_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_like_created
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_like();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notification_settings_user_id ON public.notification_settings(user_id);