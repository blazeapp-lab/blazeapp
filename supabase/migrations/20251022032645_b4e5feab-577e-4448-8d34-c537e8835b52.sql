CREATE OR REPLACE FUNCTION public.admin_delete_all_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete all notifications';
  END IF;

  -- Delete all notifications
  TRUNCATE TABLE public.notifications RESTART IDENTITY;
END;
$function$