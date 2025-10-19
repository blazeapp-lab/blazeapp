-- First, clean up any existing profiles with external URLs (set them to null for security)
UPDATE public.profiles
SET 
  avatar_url = NULL
WHERE avatar_url IS NOT NULL 
  AND avatar_url !~ '^https://nxtnonfxxophicxewkmw.supabase.co/storage/v1/object/public/profiles/';

UPDATE public.profiles
SET 
  banner_url = NULL
WHERE banner_url IS NOT NULL 
  AND banner_url !~ '^https://nxtnonfxxophicxewkmw.supabase.co/storage/v1/object/public/profiles/';

-- Create function to validate profile image URLs
CREATE OR REPLACE FUNCTION public.validate_profile_image_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  storage_url_pattern TEXT;
BEGIN
  -- Define the allowed storage URL pattern for this project
  storage_url_pattern := 'https://nxtnonfxxophicxewkmw.supabase.co/storage/v1/object/public/profiles/';
  
  -- Validate avatar_url
  IF NEW.avatar_url IS NOT NULL THEN
    IF NEW.avatar_url !~ ('^' || storage_url_pattern) THEN
      RAISE EXCEPTION 'avatar_url must be from the Blaze storage bucket or null';
    END IF;
  END IF;
  
  -- Validate banner_url
  IF NEW.banner_url IS NOT NULL THEN
    IF NEW.banner_url !~ ('^' || storage_url_pattern) THEN
      RAISE EXCEPTION 'banner_url must be from the Blaze storage bucket or null';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_validate_profile_image_urls ON public.profiles;

-- Create trigger to validate profile image URLs on insert and update
CREATE TRIGGER trg_validate_profile_image_urls
  BEFORE INSERT OR UPDATE OF avatar_url, banner_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_image_urls();