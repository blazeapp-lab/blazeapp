-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view profile images
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profiles');