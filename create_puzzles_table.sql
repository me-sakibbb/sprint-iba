-- Create puzzles table
CREATE TABLE IF NOT EXISTS puzzles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add puzzle_id to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS puzzle_id UUID REFERENCES puzzles(id);

-- Enable RLS on puzzles
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

-- Create policy for reading puzzles (public access)
CREATE POLICY "Allow public read access" ON puzzles
    FOR SELECT USING (true);
