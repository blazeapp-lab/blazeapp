-- Fix user deletion function to handle auth users properly
CREATE OR REPLACE FUNCTION public.admin_bulk_delete_users(user_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_item UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete each user's data
  FOREACH user_id_item IN ARRAY user_ids
  LOOP
    -- Prevent deleting yourself
    IF user_id_item != auth.uid() THEN
      -- 1) Delete user-owned reactions
      DELETE FROM public.broken_hearts WHERE user_id = user_id_item;
      DELETE FROM public.comment_likes WHERE user_id = user_id_item;
      DELETE FROM public.likes WHERE user_id = user_id_item;
      DELETE FROM public.reposts WHERE user_id = user_id_item;

      -- 2) Delete post views
      DELETE FROM public.post_views WHERE user_id = user_id_item;

      -- 3) Delete comments by the user
      DELETE FROM public.comments WHERE user_id = user_id_item;

      -- 4) Delete the user's posts
      DELETE FROM public.posts WHERE user_id = user_id_item;

      -- 5) Delete follows relationships
      DELETE FROM public.follows WHERE follower_id = user_id_item OR following_id = user_id_item;

      -- 6) Delete notifications
      DELETE FROM public.notifications WHERE user_id = user_id_item OR actor_id = user_id_item;

      -- 7) Delete content reports
      DELETE FROM public.content_reports WHERE reporter_id = user_id_item OR reviewed_by = user_id_item;

      -- 8) Delete user-specific settings and blocks
      DELETE FROM public.notification_settings WHERE user_id = user_id_item;
      DELETE FROM public.user_suspensions WHERE user_id = user_id_item;
      DELETE FROM public.blocks WHERE blocker_id = user_id_item OR blocked_id = user_id_item;
      DELETE FROM public.user_roles WHERE user_id = user_id_item;

      -- 9) Delete profile (this will cascade to auth.users via trigger)
      DELETE FROM public.profiles WHERE id = user_id_item;
    END IF;
  END LOOP;
END;
$$;