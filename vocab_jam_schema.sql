-- Add Question Types
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question_type text CHECK (question_type IN ('MCQ', 'REVERSE', 'SPELLING')) DEFAULT 'MCQ';

-- Update Game Lobbies for Boss Mode
ALTER TABLE game_lobbies 
ADD COLUMN IF NOT EXISTS boss_hp integer DEFAULT 10000,
ADD COLUMN IF NOT EXISTS boss_max_hp integer DEFAULT 10000,
ADD COLUMN IF NOT EXISTS active_powerups jsonb DEFAULT '[]'::jsonb; -- Track active global effects if needed

-- Update Game Participants for RPG & Inventory
ALTER TABLE game_participants 
ADD COLUMN IF NOT EXISTS inventory jsonb DEFAULT '[]'::jsonb, -- Array of power-up strings e.g. ["INK", "FOG"]
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- Update Profiles for Long-term Progression (Optional, if profiles table exists)
-- Using DO block to check if table exists to avoid error
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unlocked_cosmetics text[] DEFAULT '{}';
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_level integer DEFAULT 1;
    END IF;
END $$;
