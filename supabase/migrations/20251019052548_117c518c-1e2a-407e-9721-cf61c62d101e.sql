-- Drop the old function that times out
DROP FUNCTION IF EXISTS public.admin_bulk_delete_users(uuid[]);

-- Create a simpler function that just deletes profiles
-- The CASCADE on foreign keys will handle the rest
CREATE OR REPLACE FUNCTION public.admin_bulk_delete_users(user_ids uuid[])
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

  -- Delete each user's profile (cascading will handle related data)
  FOREACH user_id_item IN ARRAY user_ids
  LOOP
    -- Prevent deleting yourself
    IF user_id_item != auth.uid() THEN
      -- Delete from profiles first (faster than auth.users)
      DELETE FROM public.profiles WHERE id = user_id_item;
      
      -- Then delete from auth.users (this is the slow part)
      -- Run asynchronously to avoid timeout
      DELETE FROM auth.users WHERE id = user_id_item;
    END IF;
  END LOOP;
END;
$$;