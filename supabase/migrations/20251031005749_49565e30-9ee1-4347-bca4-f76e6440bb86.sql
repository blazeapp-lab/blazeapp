-- Fix profile deletion trigger to avoid tuple modification conflict
-- The BEFORE DELETE trigger deleted auth.users which cascaded back to the same profile row
-- causing: 27000 tuple to be deleted was already modified by an operation triggered by the current command

-- 1) Drop the problematic BEFORE DELETE trigger
DROP TRIGGER IF EXISTS on_profile_delete ON public.profiles;

-- 2) Recreate it as an AFTER DELETE trigger
CREATE TRIGGER on_profile_delete
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_deletion();