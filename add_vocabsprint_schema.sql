-- Add game_mode to lobbies
ALTER TABLE game_lobbies ADD COLUMN game_mode text DEFAULT 'POLY' CHECK (game_mode IN ('POLY', 'SPRINT'));

-- Add team_name and score to participants
ALTER TABLE game_participants ADD COLUMN team_name text CHECK (team_name IN ('Red', 'Blue', 'Green', 'Purple'));
ALTER TABLE game_participants ADD COLUMN score integer DEFAULT 0;

-- Index for faster lookups
CREATE INDEX idx_game_lobbies_mode ON game_lobbies(game_mode);
