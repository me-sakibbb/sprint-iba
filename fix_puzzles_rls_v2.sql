-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access" ON puzzles;
DROP POLICY IF EXISTS "Allow anon insert" ON puzzles;

-- Enable RLS (idempotent)
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

-- Re-create policies
CREATE POLICY "Allow public read access" ON puzzles FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON puzzles FOR INSERT WITH CHECK (true);
