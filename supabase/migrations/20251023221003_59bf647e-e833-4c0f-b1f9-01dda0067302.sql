-- Create blocked_phrases table
CREATE TABLE public.blocked_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.blocked_phrases ENABLE ROW LEVEL SECURITY;

-- Admins can manage blocked phrases
CREATE POLICY "Admins can manage blocked phrases"
ON public.blocked_phrases
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to check for blocked phrases
CREATE OR REPLACE FUNCTION public.check_blocked_phrases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  blocked_phrase_record RECORD;
BEGIN
  -- Check if content matches any blocked phrase exactly
  FOR blocked_phrase_record IN 
    SELECT phrase FROM public.blocked_phrases
  LOOP
    IF NEW.content = blocked_phrase_record.phrase THEN
      RAISE EXCEPTION 'This content is not allowed';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Add trigger to posts table
CREATE TRIGGER enforce_blocked_phrases
BEFORE INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.check_blocked_phrases();