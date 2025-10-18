-- Add pinned_post_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN pinned_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_profiles_pinned_post_id ON public.profiles(pinned_post_id);