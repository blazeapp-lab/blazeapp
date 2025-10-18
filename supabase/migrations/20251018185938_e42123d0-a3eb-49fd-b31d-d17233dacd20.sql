-- Drop the existing check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated check constraint with all notification types including new_post, repost, and tag
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('like', 'comment', 'follow', 'broken_heart', 'repost', 'comment_like', 'tag', 'new_post'));