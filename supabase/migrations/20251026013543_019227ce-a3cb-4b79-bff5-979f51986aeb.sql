-- Create comprehensive server-side ban/suspension enforcement

-- 1. Helper function to check if user should be blocked (combines ban + suspension)
CREATE OR REPLACE FUNCTION public.is_user_blocked(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Check if banned
  SELECT COALESCE(
    (SELECT is_banned FROM public.profiles WHERE id = check_user_id),
    false
  )
  -- OR suspended
  OR public.is_user_suspended(check_user_id);
$$;

-- 2. Add RLS policy to BLOCK banned/suspended users from ALL posts operations
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "Users can create their own posts"
ON public.posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 3. Block banned/suspended users from comments
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
CREATE POLICY "Users can create their own comments"
ON public.comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 4. Block banned/suspended users from likes
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
CREATE POLICY "Users can create their own likes"
ON public.likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes"
ON public.likes
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 5. Block banned/suspended users from broken hearts
DROP POLICY IF EXISTS "Users can create their own broken hearts" ON public.broken_hearts;
CREATE POLICY "Users can create their own broken hearts"
ON public.broken_hearts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own broken hearts" ON public.broken_hearts;
CREATE POLICY "Users can delete their own broken hearts"
ON public.broken_hearts
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 6. Block banned/suspended users from reposts
DROP POLICY IF EXISTS "Users can create reposts" ON public.reposts;
CREATE POLICY "Users can create reposts"
ON public.reposts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their reposts" ON public.reposts;
CREATE POLICY "Users can delete their reposts"
ON public.reposts
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 7. Block banned/suspended users from comment likes
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments"
ON public.comment_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments"
ON public.comment_likes
FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 8. Block banned/suspended users from follows
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (
  auth.uid() = follower_id 
  AND NOT is_blocked(auth.uid(), following_id) 
  AND NOT is_blocked(following_id, auth.uid())
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
ON public.follows
FOR DELETE
USING (
  auth.uid() = follower_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 9. Block banned/suspended users from blocks (they can't even block others)
DROP POLICY IF EXISTS "Users can block others" ON public.blocks;
CREATE POLICY "Users can block others"
ON public.blocks
FOR INSERT
WITH CHECK (
  auth.uid() = blocker_id 
  AND blocker_id <> blocked_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 10. Block banned/suspended users from reporting
DROP POLICY IF EXISTS "Users can create reports" ON public.content_reports;
CREATE POLICY "Users can create reports"
ON public.content_reports
FOR INSERT
WITH CHECK (
  auth.uid() = reporter_id
  AND NOT public.is_user_blocked(auth.uid())
);

-- 11. Add trigger to auto-revoke sessions when user is banned
CREATE OR REPLACE FUNCTION public.revoke_sessions_on_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If user is being banned, delete all their refresh tokens
  IF NEW.is_banned = true AND (OLD.is_banned IS NULL OR OLD.is_banned = false) THEN
    -- Note: We can't directly delete from auth.refresh_tokens in a trigger on public.profiles
    -- Instead, we log this for the edge function to handle, or we notify the client
    -- The client-side check will force sign out
    RAISE NOTICE 'User % has been banned', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_ban ON public.profiles;
CREATE TRIGGER on_profile_ban
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.is_banned IS DISTINCT FROM OLD.is_banned)
  EXECUTE FUNCTION public.revoke_sessions_on_ban();