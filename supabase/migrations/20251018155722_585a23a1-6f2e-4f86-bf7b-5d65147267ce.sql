-- Add unique constraint to username column
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Create index for case-insensitive username lookups (for @ mentions)
CREATE INDEX idx_profiles_username_lower ON public.profiles (LOWER(username));