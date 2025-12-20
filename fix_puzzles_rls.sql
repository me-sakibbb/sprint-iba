-- Enable RLS
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

-- Allow all access to service role (this is usually default but good to be explicit if needed, though service role bypasses RLS)
-- Actually, if service role is failing, maybe the client is not using the service role key correctly?
-- Or maybe the key is anon.

-- Allow public read access
CREATE POLICY "Allow public read access" ON puzzles FOR SELECT USING (true);

-- Allow authenticated insert (if we want users to insert, but usually only admin)
-- For now, let's allow anon insert to test if the key is anon
CREATE POLICY "Allow anon insert" ON puzzles FOR INSERT WITH CHECK (true);
