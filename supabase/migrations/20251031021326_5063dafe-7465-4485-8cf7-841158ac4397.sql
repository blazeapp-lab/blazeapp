-- Enable RLS on rate_limit_logs table
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Allow system to insert rate limit logs
CREATE POLICY "System can insert rate limit logs" ON public.rate_limit_logs
FOR INSERT
WITH CHECK (true);

-- Allow admins to view rate limit logs
CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));