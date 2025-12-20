-- ============================================
-- Complete VP Gamification Setup Script
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Create all tables (if not exists)
-- Level Definitions Table
CREATE TABLE IF NOT EXISTS public.level_definitions (
    id integer PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    vp_threshold bigint NOT NULL,
    track text NOT NULL CHECK (track IN ('WARM_UP', 'PICKING_UP_PACE', 'FAST_LANE', 'PODIUM')),
    track_color text NOT NULL,
    badge_image_url text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- User Levels Table
CREATE TABLE IF NOT EXISTS public.user_levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_level integer REFERENCES public.level_definitions(id) DEFAULT 1 NOT NULL,
    total_vp bigint DEFAULT 0 NOT NULL,
    last_level_up_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Velocity Points Table
CREATE TABLE IF NOT EXISTS public.velocity_points (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL CHECK (reason IN ('correct_answer', 'module_complete', 'daily_streak', 'bonus', 'manual_adjustment')),
    question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Badge Achievements Table
CREATE TABLE IF NOT EXISTS public.badge_achievements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    level_id integer REFERENCES public.level_definitions(id) NOT NULL,
    unlocked_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, level_id)
);

-- Step 2: Create Indexes
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON public.user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_velocity_points_user_id ON public.velocity_points(user_id);
CREATE INDEX IF NOT EXISTS idx_velocity_points_created_at ON public.velocity_points(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_achievements_user_id ON public.badge_achievements(user_id);

-- Step 3: Enable RLS
ALTER TABLE public.level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.velocity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_achievements ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Level definitions are viewable by everyone" ON public.level_definitions;
DROP POLICY IF EXISTS "User levels are viewable by everyone" ON public.user_levels;
DROP POLICY IF EXISTS "Users can insert their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can view their own velocity points" ON public.velocity_points;
DROP POLICY IF EXISTS "Users can insert their own velocity points" ON public.velocity_points;
DROP POLICY IF EXISTS "Badge achievements are viewable by everyone" ON public.badge_achievements;
DROP POLICY IF EXISTS "Users can unlock their own badges" ON public.badge_achievements;

-- Step 5: Create RLS Policies
CREATE POLICY "Level definitions are viewable by everyone"
ON public.level_definitions FOR SELECT
USING (true);

CREATE POLICY "User levels are viewable by everyone"
ON public.user_levels FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own level"
ON public.user_levels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level"
ON public.user_levels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own velocity points"
ON public.velocity_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own velocity points"
ON public.velocity_points FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Badge achievements are viewable by everyone"
ON public.badge_achievements FOR SELECT
USING (true);

CREATE POLICY "Users can unlock their own badges"
ON public.badge_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 6: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_levels_updated_at ON public.user_levels;
CREATE TRIGGER trigger_update_user_levels_updated_at
BEFORE UPDATE ON public.user_levels
FOR EACH ROW
EXECUTE FUNCTION update_user_levels_updated_at();

-- Step 7: Populate level definitions (12 levels)
INSERT INTO public.level_definitions (id, name, description, vp_threshold, track, track_color, badge_image_url) VALUES
(1, 'The Rookie', 'You''ve stepped onto the track. Time to lace up.', 0, 'WARM_UP', '#3dd5d1', '/assets/badges/rookie.png'),
(2, 'The Stretcher', 'Warming up the mental muscles.', 1500, 'WARM_UP', '#14b8a6', '/assets/badges/stretcher.png'),
(3, 'The Jogger', 'Finding a steady rhythm in your studies.', 5000, 'WARM_UP', '#0891b2', '/assets/badges/jogger.png'),
(4, 'The Pacer', 'You are hitting consistent targets. Keep this tempo!', 15000, 'PICKING_UP_PACE', '#c0c0c0', '/assets/badges/pacer.png'),
(5, 'The Strider', 'Covering more ground with every session.', 35000, 'PICKING_UP_PACE', '#4169e1', '/assets/badges/strider.svg'),
(6, 'The Hurdler', 'Obstacles don''t stop you; you jump right over them.', 75000, 'PICKING_UP_PACE', '#1e90ff', '/assets/badges/hurdler.svg'),
(7, 'The Sprinter', 'Full speed ahead. You are a serious contender.', 150000, 'FAST_LANE', '#ffd700', '/assets/badges/sprinter.svg'),
(8, 'The Velocity Master', 'You are moving faster than the competition.', 300000, 'FAST_LANE', '#ff8c00', '/assets/badges/velocity_master.svg'),
(9, 'The Mach 1', 'Breaking personal records every day. Supersonic mental speed.', 550000, 'FAST_LANE', '#ff4500', '/assets/badges/mach1.png'),
(10, 'The Olympian', 'You are in the top tier of aspirants. Elite performance.', 1000000, 'PODIUM', '#e5e4e2', '/assets/badges/olympian.svg'),
(11, 'The Record Breaker', 'You aren''t just participating; you are redefining the standard.', 2000000, 'PODIUM', '#9d00ff', '/assets/badges/record_breaker.svg'),
(12, 'The IBA Titan', 'The finish line is yours. You are ready to conquer the admission test.', 4000000, 'PODIUM', '#b9f2ff', '/assets/badges/iba_titan.svg')
ON CONFLICT (id) DO NOTHING;

-- Step 8: Create user_level record for current user (if doesn't exist)
-- You need to replace 'YOUR_USER_ID' with your actual user ID
-- To find your user ID, run: SELECT id FROM auth.users WHERE email = 'your_email@example.com';
-- Then uncomment and run:
-- INSERT INTO public.user_levels (user_id, current_level, total_vp)
-- VALUES ('YOUR_USER_ID', 1, 0)
-- ON CONFLICT (user_id) DO NOTHING;

-- OR run this to auto-create for all existing users:
INSERT INTO public.user_levels (user_id, current_level, total_vp)
SELECT id, 1, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_levels)
ON CONFLICT (user_id) DO NOTHING;
