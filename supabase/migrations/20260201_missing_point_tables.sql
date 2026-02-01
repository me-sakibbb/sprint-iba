-- ============================================
-- MISSING POINT SYSTEM TABLES
-- Created: 2026-02-01
-- ============================================

-- USER LEVELS TABLE
-- Tracks current VP and Level for each user
CREATE TABLE IF NOT EXISTS public.user_levels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level integer DEFAULT 1,
    total_vp integer DEFAULT 0,
    last_level_up_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- VELOCITY POINTS TABLE (Transaction Log)
-- Records every point transaction for auditing and history
CREATE TABLE IF NOT EXISTS public.velocity_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    reason text NOT NULL,
    question_id uuid, -- Optional, for answers
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.velocity_points ENABLE ROW LEVEL SECURITY;

-- USER_LEVELS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_levels' AND policyname = 'Users can view own level') THEN
        CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_levels' AND policyname = 'Users can insert own level') THEN
        CREATE POLICY "Users can insert own level" ON public.user_levels FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_levels' AND policyname = 'Users can update own level') THEN
        CREATE POLICY "Users can update own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- VELOCITY_POINTS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'velocity_points' AND policyname = 'Users can view own transactions') THEN
        CREATE POLICY "Users can view own transactions" ON public.velocity_points FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'velocity_points' AND policyname = 'Users can insert own transactions') THEN
        CREATE POLICY "Users can insert own transactions" ON public.velocity_points FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- TRIGGER FOR UPDATED_AT
DROP TRIGGER IF EXISTS user_levels_updated_at ON public.user_levels;
CREATE TRIGGER user_levels_updated_at
    BEFORE UPDATE ON public.user_levels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_velocity_points_user_id ON public.velocity_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON public.user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_velocity_points_created_at ON public.velocity_points(created_at);
