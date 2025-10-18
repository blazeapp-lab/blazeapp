-- Enforce block rules server-side: prevent following when either side has blocked the other
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;

CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (
  auth.uid() = follower_id
  AND NOT public.is_blocked(auth.uid(), following_id)
  AND NOT public.is_blocked(following_id, auth.uid())
);