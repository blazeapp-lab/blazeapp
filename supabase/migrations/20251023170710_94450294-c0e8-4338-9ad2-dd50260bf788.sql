-- Create admin function to delete all follows
CREATE OR REPLACE FUNCTION public.admin_delete_all_follows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete all follows';
  END IF;

  -- Delete all follows
  TRUNCATE TABLE public.follows RESTART IDENTITY;
END;
$function$;