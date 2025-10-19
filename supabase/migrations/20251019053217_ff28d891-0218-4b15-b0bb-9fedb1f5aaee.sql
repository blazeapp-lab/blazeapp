-- Delete users with usernames longer than 16 characters
DELETE FROM public.profiles 
WHERE LENGTH(username) > 16;

-- Add constraint to enforce 16 character limit on usernames
ALTER TABLE public.profiles 
ADD CONSTRAINT username_length_check 
CHECK (LENGTH(username) <= 16);