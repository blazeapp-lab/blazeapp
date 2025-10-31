-- Allow admins to delete any post, repost, comment, follow, like, and notification

-- Update posts DELETE policy
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE
USING (
  (auth.uid() = user_id AND NOT is_user_blocked(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update reposts DELETE policy
DROP POLICY IF EXISTS "Users can delete their reposts" ON public.reposts;
CREATE POLICY "Users can delete their reposts" ON public.reposts
FOR DELETE
USING (
  (auth.uid() = user_id AND NOT is_user_blocked(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update comments DELETE policy
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE
USING (
  (auth.uid() = user_id AND NOT is_user_blocked(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update follows DELETE policy
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows
FOR DELETE
USING (
  (auth.uid() = follower_id AND NOT is_user_blocked(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update likes DELETE policy
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes" ON public.likes
FOR DELETE
USING (
  (auth.uid() = user_id AND NOT is_user_blocked(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update notifications DELETE policy
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);