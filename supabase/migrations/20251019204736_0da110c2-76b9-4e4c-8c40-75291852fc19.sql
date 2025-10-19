
-- Create profiles for all auth users that don't have them
-- Generate safe usernames and display names that respect constraints
INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
SELECT 
  au.id,
  -- Username: max 16 chars, ensure uniqueness with user ID
  'u_' || substr(replace(au.id::text, '-', ''), 1, 14) as username,
  -- Display name: max 32 chars
  COALESCE(
    substring(au.raw_user_meta_data->>'display_name' from 1 for 32),
    'User'
  ) as display_name,
  au.created_at,
  au.created_at as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
