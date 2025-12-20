-- Add image_url column to questions table
ALTER TABLE questions ADD COLUMN image_url TEXT;

-- Optional: Add comment
COMMENT ON COLUMN questions.image_url IS 'URL to an image associated with the question (e.g., a diagram)';
