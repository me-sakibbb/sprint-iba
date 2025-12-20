-- Enable RLS on questions table
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public questions are viewable by everyone." ON questions;
DROP POLICY IF EXISTS "Operators can insert questions." ON questions;
DROP POLICY IF EXISTS "Operators can update questions." ON questions;
DROP POLICY IF EXISTS "Operators can delete questions." ON questions;

-- 1. Allow everyone (anon and authenticated) to SELECT questions
CREATE POLICY "Public questions are viewable by everyone."
ON questions FOR SELECT
USING (true);

-- 2. Allow Operators to INSERT questions
CREATE POLICY "Operators can insert questions."
ON questions FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'operator'
  )
);

-- 3. Allow Operators to UPDATE questions
CREATE POLICY "Operators can update questions."
ON questions FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'operator'
  )
);

-- 4. Allow Operators to DELETE questions
CREATE POLICY "Operators can delete questions."
ON questions FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'operator'
  )
);
