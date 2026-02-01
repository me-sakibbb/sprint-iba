-- ============================================
-- POINT SYSTEM SCHEMA
-- Creates tables for configurable point system and streak tracking
-- ============================================

-- ============================================
-- POINT CONFIGURATION TABLE
-- Stores admin-configurable point values and system settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.point_configuration (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text UNIQUE NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.point_configuration ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read, only admins can modify
CREATE POLICY "Anyone can view point configuration"
    ON public.point_configuration FOR SELECT
    USING (true);

CREATE POLICY "Admins can update point configuration"
    ON public.point_configuration FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert point configuration"
    ON public.point_configuration FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================
-- USER STREAKS TABLE
-- Tracks user login and practice streaks
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_streak_count integer DEFAULT 0,
    login_streak_last_date date,
    practice_streak_count integer DEFAULT 0,
    practice_streak_last_date date,
    longest_login_streak integer DEFAULT 0,
    longest_practice_streak integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own streaks"
    ON public.user_streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
    ON public.user_streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
    ON public.user_streaks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all streaks"
    ON public.user_streaks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_point_configuration_key ON public.point_configuration(config_key);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks(user_id);

-- ============================================
-- SEED DEFAULT CONFIGURATION
-- ============================================
INSERT INTO public.point_configuration (config_key, config_value, description) VALUES
    ('point_values_correct', '{"easy": 50, "medium": 100, "hard": 200}'::jsonb, 'VP awarded for correct answers by difficulty'),
    ('point_values_wrong', '{"easy": -15, "medium": -25, "hard": -40}'::jsonb, 'VP deducted for wrong answers by difficulty'),
    ('session_completion_bonus', '100'::jsonb, 'VP awarded for completing a practice session'),
    ('perfect_score_bonus', '500'::jsonb, 'VP awarded for 100% score in a session'),
    ('high_score_bonus', '250'::jsonb, 'VP awarded for 80%+ score in a session'),
    ('high_score_threshold', '80'::jsonb, 'Minimum percentage for high score bonus'),
    ('speed_bonus_max', '50'::jsonb, 'Maximum speed bonus VP per question in timed mode'),
    ('exam_completion_bonus', '500'::jsonb, 'VP awarded for completing an exam'),
    ('exam_top_10_bonus', '1000'::jsonb, 'VP awarded for scoring in top 10%'),
    ('exam_perfect_bonus', '2000'::jsonb, 'VP awarded for perfect exam score'),
    ('login_streak_daily', '50'::jsonb, 'Daily VP bonus for login streak'),
    ('practice_streak_daily', '100'::jsonb, 'Daily VP bonus for practice streak'),
    ('streak_multipliers', '{"7": 1.5, "14": 2.0, "30": 2.5}'::jsonb, 'Streak day thresholds and their multipliers'),
    ('allow_negative_points', 'false'::jsonb, 'Whether total VP can go below 0'),
    ('min_practice_questions', '3'::jsonb, 'Minimum questions to answer for practice streak count')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_point_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER point_configuration_updated_at
    BEFORE UPDATE ON public.point_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_point_config_timestamp();

CREATE TRIGGER user_streaks_updated_at
    BEFORE UPDATE ON public.user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
