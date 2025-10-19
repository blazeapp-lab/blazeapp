-- Improve admin_bulk_delete_users to remove dependent data and reduce FK/timeouts
CREATE OR REPLACE FUNCTION public.admin_bulk_delete_users(user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id_item UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete each user's data safely
  FOREACH user_id_item IN ARRAY user_ids
  LOOP
    -- Prevent deleting yourself
    IF user_id_item != auth.uid() THEN
      -- 1) Delete user-owned reaction tables
      DELETE FROM public.broken_hearts WHERE user_id = user_id_item;
      DELETE FROM public.comment_likes WHERE user_id = user_id_item;
      DELETE FROM public.likes WHERE user_id = user_id_item;
      DELETE FROM public.reposts WHERE user_id = user_id_item;

      -- 2) Delete post views by the user and views on the user's posts
      DELETE FROM public.post_views pv
      WHERE pv.user_id = user_id_item
         OR EXISTS (
           SELECT 1 FROM public.posts p
           WHERE p.id = pv.post_id AND p.user_id = user_id_item
         );

      -- 3) Delete comments by the user and comments on the user's posts
      DELETE FROM public.comments c
      WHERE c.user_id = user_id_item
         OR EXISTS (
           SELECT 1 FROM public.posts p
           WHERE p.id = c.post_id AND p.user_id = user_id_item
         );

      -- 4) Delete the user's posts (counters and triggers handle aggregates)
      DELETE FROM public.posts WHERE user_id = user_id_item;

      -- 5) Delete follows relationships
      DELETE FROM public.follows WHERE follower_id = user_id_item OR following_id = user_id_item;

      -- 6) Delete notifications involving the user
      DELETE FROM public.notifications WHERE user_id = user_id_item OR actor_id = user_id_item;

      -- 7) Delete user-specific settings, suspensions, blocks, and roles
      DELETE FROM public.notification_settings WHERE user_id = user_id_item;
      DELETE FROM public.user_suspensions WHERE user_id = user_id_item;
      DELETE FROM public.blocks WHERE blocker_id = user_id_item OR blocked_id = user_id_item;
      DELETE FROM public.user_roles WHERE user_id = user_id_item;

      -- 8) Delete profile
      DELETE FROM public.profiles WHERE id = user_id_item;

      -- 9) Finally delete the auth user (may be slow)
      DELETE FROM auth.users WHERE id = user_id_item;
    END IF;
  END LOOP;
END;
$function$;