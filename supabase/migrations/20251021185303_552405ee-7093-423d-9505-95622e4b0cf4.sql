-- Add validation to prevent null/empty content in posts
ALTER TABLE public.posts 
ADD CONSTRAINT content_not_empty CHECK (
  content IS NOT NULL AND 
  trim(content) != '' AND
  length(trim(content)) > 0 AND
  length(content) <= 5000
);

-- Update any existing posts with null/empty content to placeholder text
UPDATE public.posts 
SET content = '[Content removed]'
WHERE content IS NULL OR trim(content) = '' OR length(trim(content)) = 0;