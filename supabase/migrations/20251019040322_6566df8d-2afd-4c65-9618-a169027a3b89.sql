-- Restore public avatar/banner uploads by removing the blocking trigger and enabling URL validation
DO $$
BEGIN
  -- Drop blocking trigger if present
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_block_profile_image_urls'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'DROP TRIGGER trg_block_profile_image_urls ON public.profiles;';
  END IF;

  -- Drop existing validation trigger to ensure a clean recreate
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_validate_profile_image_urls'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'DROP TRIGGER trg_validate_profile_image_urls ON public.profiles;';
  END IF;

  -- Create validation trigger (allows nulls, enforces storage URL pattern)
  EXECUTE 'CREATE TRIGGER trg_validate_profile_image_urls
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_image_urls();';
END $$;