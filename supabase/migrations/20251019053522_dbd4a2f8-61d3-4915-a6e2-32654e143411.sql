-- Truncate display names that exceed 32 characters
UPDATE public.profiles
SET display_name = LEFT(display_name, 32)
WHERE LENGTH(display_name) > 32;

-- Add check constraint to enforce 32 character limit on display_name
ALTER TABLE public.profiles
ADD CONSTRAINT display_name_length_check CHECK (LENGTH(display_name) <= 32);