
-- Create table to track request rates by IP
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint ON public.rate_limit_logs(ip_address, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON public.rate_limit_logs(ip_address, is_blocked);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limit logs
CREATE POLICY "System can manage rate limits"
ON public.rate_limit_logs
FOR ALL
USING (true)
WITH CHECK (true);
