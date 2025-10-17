-- Create function to delete user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user data (in order to avoid foreign key violations)
  DELETE FROM public.broken_hearts WHERE user_id = current_user_id;
  DELETE FROM public.comment_likes WHERE user_id = current_user_id;
  DELETE FROM public.likes WHERE user_id = current_user_id;
  DELETE FROM public.reposts WHERE user_id = current_user_id;
  DELETE FROM public.post_views WHERE user_id = current_user_id;
  DELETE FROM public.comments WHERE user_id = current_user_id;
  DELETE FROM public.posts WHERE user_id = current_user_id;
  DELETE FROM public.follows WHERE follower_id = current_user_id OR following_id = current_user_id;
  DELETE FROM public.profiles WHERE id = current_user_id;
  
  -- Delete the auth user (this will cascade to any remaining references)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;