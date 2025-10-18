-- Update profiles bucket to allow video file types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/x-msvideo',
  'video/mpeg'
]
WHERE id = 'profiles';