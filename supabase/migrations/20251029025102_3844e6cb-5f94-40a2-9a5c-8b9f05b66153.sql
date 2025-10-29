-- Drop the old void version of admin_bulk_delete_users to resolve conflict
-- The new jsonb version with confirm_deletion parameter is the correct one to keep
DROP FUNCTION IF EXISTS public.admin_bulk_delete_users(uuid[]);

-- Ensure the correct version exists with proper signature
-- This version requires explicit confirmation and provides detailed logging
CREATE OR REPLACE FUNCTION public.admin_bulk_delete_users(user_ids uuid[], confirm_deletion boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_item UUID;
  deleted_count INTEGER := 0;
  deleted_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Check admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Require explicit confirmation
  IF NOT confirm_deletion THEN
    RAISE EXCEPTION 'Deletion must be explicitly confirmed. Set confirm_deletion to true.';
  END IF;

  -- Limit array size to prevent mass deletion accidents
  IF array_length(user_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 users at once. Current request: % users', array_length(user_ids, 1);
  END IF;

  -- Log the deletion attempt BEFORE deleting
  INSERT INTO public.admin_audit_logs (admin_id, action, target_ids, details)
  VALUES (
    auth.uid(),
    'bulk_delete_users_attempt',
    user_ids,
    jsonb_build_object(
      'user_count', array_length(user_ids, 1),
      'timestamp', now()
    )
  );

  -- Perform deletions
  FOREACH user_id_item IN ARRAY user_ids
  LOOP
    -- Prevent admin from deleting themselves
    IF user_id_item != auth.uid() THEN
      -- Delete user data (cascading)
      DELETE FROM public.broken_hearts WHERE user_id = user_id_item;
      DELETE FROM public.comment_likes WHERE user_id = user_id_item;
      DELETE FROM public.likes WHERE user_id = user_id_item;
      DELETE FROM public.reposts WHERE user_id = user_id_item;
      DELETE FROM public.post_views WHERE user_id = user_id_item;
      DELETE FROM public.comments WHERE user_id = user_id_item;
      DELETE FROM public.posts WHERE user_id = user_id_item;
      DELETE FROM public.follows WHERE follower_id = user_id_item OR following_id = user_id_item;
      DELETE FROM public.notifications WHERE user_id = user_id_item OR actor_id = user_id_item;
      DELETE FROM public.content_reports WHERE reporter_id = user_id_item OR reviewed_by = user_id_item;
      DELETE FROM public.notification_settings WHERE user_id = user_id_item;
      DELETE FROM public.user_suspensions WHERE user_id = user_id_item;
      DELETE FROM public.blocks WHERE blocker_id = user_id_item OR blocked_id = user_id_item;
      DELETE FROM public.user_roles WHERE user_id = user_id_item;
      DELETE FROM public.profiles WHERE id = user_id_item;
      
      deleted_ids := array_append(deleted_ids, user_id_item);
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;

  -- Log successful deletion
  INSERT INTO public.admin_audit_logs (admin_id, action, target_ids, details)
  VALUES (
    auth.uid(),
    'bulk_delete_users_completed',
    deleted_ids,
    jsonb_build_object(
      'deleted_count', deleted_count,
      'timestamp', now()
    )
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'deleted_user_ids', deleted_ids
  );
END;
$$;