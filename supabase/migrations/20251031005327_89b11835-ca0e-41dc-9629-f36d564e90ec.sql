
-- Fix account deletion to prevent "tuple already modified" error
-- This happens when multiple operations try to delete the same row
-- Solution: Delete in proper order and handle each table independently

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

  -- Delete from all tables in one batch to avoid tuple conflicts
  -- Start with dependent tables first, then move to parent tables
  
  -- Delete interactions (likes, hearts, reposts, views)
  DELETE FROM public.broken_hearts WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.comment_likes WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.likes WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.reposts WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.post_views WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  
  -- Delete content
  DELETE FROM public.comments WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.posts WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  
  -- Delete relationships
  DELETE FROM public.follows 
  WHERE (follower_id = ANY(user_ids) OR following_id = ANY(user_ids)) 
    AND follower_id != auth.uid() AND following_id != auth.uid();
  
  DELETE FROM public.blocks 
  WHERE (blocker_id = ANY(user_ids) OR blocked_id = ANY(user_ids))
    AND blocker_id != auth.uid() AND blocked_id != auth.uid();
  
  -- Delete notifications and reports
  DELETE FROM public.notifications 
  WHERE (user_id = ANY(user_ids) OR actor_id = ANY(user_ids))
    AND user_id != auth.uid() AND COALESCE(actor_id, '00000000-0000-0000-0000-000000000000'::uuid) != auth.uid();
  
  DELETE FROM public.content_reports 
  WHERE (reporter_id = ANY(user_ids) OR reviewed_by = ANY(user_ids))
    AND COALESCE(reporter_id, '00000000-0000-0000-0000-000000000000'::uuid) != auth.uid() 
    AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) != auth.uid();
  
  -- Delete settings and admin data
  DELETE FROM public.notification_settings WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.user_suspensions WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  DELETE FROM public.user_roles WHERE user_id = ANY(user_ids) AND user_id != auth.uid();
  
  -- Finally delete profiles
  DELETE FROM public.profiles WHERE id = ANY(user_ids) AND id != auth.uid();
  
  -- Count successful deletions
  deleted_count := array_length(user_ids, 1);
  -- Filter out admin's own ID if it was in the list
  SELECT array_agg(uid) INTO deleted_ids 
  FROM unnest(user_ids) AS uid 
  WHERE uid != auth.uid();
  
  deleted_count := COALESCE(array_length(deleted_ids, 1), 0);

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
