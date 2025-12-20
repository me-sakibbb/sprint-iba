-- ============================================
-- Academic Athlete Gamification System Schema
-- ============================================

-- Level Definitions Table (Master data for 12 levels)
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

-- User Levels Table (Current level status for each user)
CREATE TABLE IF NOT EXISTS public.user_levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_level integer REFERENCES public.level_definitions(id) DEFAULT 1 NOT NULL,
    total_vp bigint DEFAULT 0 NOT NULL,
    last_level_up_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Velocity Points Transactions Table (VP earning history)
CREATE TABLE IF NOT EXISTS public.velocity_points (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL CHECK (reason IN ('correct_answer', 'module_complete', 'daily_streak', 'bonus', 'manual_adjustment')),
    question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Badge Achievements Table (Track unlocked badges)
CREATE TABLE IF NOT EXISTS public.badge_achievements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    level_id integer REFERENCES public.level_definitions(id) NOT NULL,
    unlocked_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, level_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON public.user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_velocity_points_user_id ON public.velocity_points(user_id);
CREATE INDEX IF NOT EXISTS idx_velocity_points_created_at ON public.velocity_points(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_achievements_user_id ON public.badge_achievements(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE public.level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.velocity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_achievements ENABLE ROW LEVEL SECURITY;

-- Level Definitions: Public read (everyone can see level info)
CREATE POLICY "Level definitions are viewable by everyone"
ON public.level_definitions FOR SELECT
USING (true);

-- User Levels: Users can view all levels (for leaderboard), update only their own
CREATE POLICY "User levels are viewable by everyone"
ON public.user_levels FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own level"
ON public.user_levels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level"
ON public.user_levels FOR UPDATE
USING (auth.uid() = user_id);

-- Velocity Points: Users can view their own VP, insert their own transactions
CREATE POLICY "Users can view their own velocity points"
ON public.velocity_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own velocity points"
ON public.velocity_points FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Badge Achievements: Users can view all badges (for comparisons), insert their own
CREATE POLICY "Badge achievements are viewable by everyone"
ON public.badge_achievements FOR SELECT
USING (true);

CREATE POLICY "Users can unlock their own badges"
ON public.badge_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Functions for Automated Updates
-- ============================================

-- Function to update user_levels.updated_at on any change
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_levels_updated_at
BEFORE UPDATE ON public.user_levels
FOR EACH ROW
EXECUTE FUNCTION update_user_levels_updated_at();

-- Function to automatically create user_level entry when new user signs up
CREATE OR REPLACE FUNCTION create_user_level_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_levels (user_id, current_level, total_vp)
    VALUES (NEW.id, 1, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_user_level_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_level_on_signup();
