-- Add blocked phrases check for comments
CREATE OR REPLACE FUNCTION public.check_blocked_phrases_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Add trigger for comments
CREATE TRIGGER check_comment_blocked_phrases
  BEFORE INSERT OR UPDATE OF content ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_blocked_phrases_comment();

-- Create blocked email domains table
CREATE TABLE public.blocked_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for signup check)
CREATE POLICY "Anyone can view blocked domains"
  ON public.blocked_email_domains
  FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage blocked domains"
  ON public.blocked_email_domains
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if email domain is blocked
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain TEXT;
  is_blocked BOOLEAN;
BEGIN
  -- Extract domain from email
  email_domain := LOWER(SPLIT_PART(NEW.email, '@', 2));
  
  -- Check if domain is blocked
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_email_domains 
    WHERE LOWER(domain) = email_domain
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RAISE EXCEPTION 'Signups from this email domain are not allowed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to auth.users
CREATE TRIGGER check_blocked_email_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_email_domain();