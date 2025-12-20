-- Add 'code' column to game_lobbies for short join codes
ALTER TABLE game_lobbies ADD COLUMN code text;

-- Create an index for faster lookup
CREATE INDEX idx_game_lobbies_code ON game_lobbies(code);

-- (Optional) Backfill existing lobbies with a random code if needed, 
-- but for now we assume new lobbies will generate it.
