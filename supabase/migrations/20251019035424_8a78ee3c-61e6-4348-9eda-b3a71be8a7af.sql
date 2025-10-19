-- Remove all existing profile and banner images
UPDATE public.profiles
SET 
  avatar_url = NULL,
  banner_url = NULL;

-- Create function to block any profile image URLs
CREATE OR REPLACE FUNCTION public.block_profile_image_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block any attempt to set avatar_url or banner_url
  IF NEW.avatar_url IS NOT NULL THEN
    RAISE EXCEPTION 'Profile images are not allowed on Blaze';
  END IF;
  
  IF NEW.banner_url IS NOT NULL THEN
    RAISE EXCEPTION 'Banner images are not allowed on Blaze';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_validate_profile_image_urls ON public.profiles;
DROP TRIGGER IF EXISTS trg_block_profile_image_urls ON public.profiles;

-- Create trigger to block profile image URLs on insert and update
CREATE TRIGGER trg_block_profile_image_urls
  BEFORE INSERT OR UPDATE OF avatar_url, banner_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_profile_image_urls();