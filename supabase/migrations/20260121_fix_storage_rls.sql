-- Create storage bucket for question images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing conflicting policies for 'question-images' bucket if they exist
-- We use unique names to avoid collisions with other buckets like 'pdfs'

DO $$ 
BEGIN
    -- Drop policies if they exist (both old generic names and new specific names)
    
    -- Old names
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
    
    -- New names (to allow re-running the script)
    DROP POLICY IF EXISTS "Allow authenticated uploads to question-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read from question-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated update in question-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated delete from question-images" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Re-create policies with UNIQUE names for 'question-images' bucket

-- 1. Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads to question-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

-- 2. Allow public read access
CREATE POLICY "Allow public read from question-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'question-images');

-- 3. Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated update in question-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'question-images');

-- 4. Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated delete from question-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'question-images');
