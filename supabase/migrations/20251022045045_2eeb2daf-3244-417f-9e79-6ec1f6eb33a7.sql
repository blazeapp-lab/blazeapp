-- Lock down notifications so only backend functions/triggers can insert
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;