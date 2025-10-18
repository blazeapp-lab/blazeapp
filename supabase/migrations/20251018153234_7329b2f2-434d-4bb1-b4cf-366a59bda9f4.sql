-- Update the profiles bucket to allow files up to 300MB
UPDATE storage.buckets
SET file_size_limit = 314572800  -- 300MB in bytes
WHERE id = 'profiles';

-- If you need other buckets to support large files in the future, 
-- they would be configured similarly