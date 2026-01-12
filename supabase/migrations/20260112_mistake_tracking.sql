-- Mistake Tracking Schema Migration (Robust & Idempotent)
-- Created: 2026-01-12
-- Purpose: Track all user mistakes with severity scoring and AI insights

-- ============================================
-- 1. MISTAKE LOGS TABLE & COLUMNS
-- ============================================
CREATE TABLE IF NOT EXISTS public.mistake_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer text,
    correct_answer text NOT NULL,
    context text NOT NULL CHECK (context IN ('practice', 'exam')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='mistake_logs' AND column_name='session_id') THEN
        ALTER TABLE public.mistake_logs ADD COLUMN session_id uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='mistake_logs' AND column_name='time_taken_seconds') THEN
        ALTER TABLE public.mistake_logs ADD COLUMN time_taken_seconds integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='mistake_logs' AND column_name='topic') THEN
        ALTER TABLE public.mistake_logs ADD COLUMN topic text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='mistake_logs' AND column_name='subtopic') THEN
        ALTER TABLE public.mistake_logs ADD COLUMN subtopic text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='mistake_logs' AND column_name='difficulty') THEN
        ALTER TABLE public.mistake_logs ADD COLUMN difficulty text;
    END IF;
END $$;

-- RLS for mistake_logs
ALTER TABLE public.mistake_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistake_logs' AND policyname = 'Users can view own mistake logs') THEN
        CREATE POLICY "Users can view own mistake logs"
            ON public.mistake_logs FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistake_logs' AND policyname = 'Users can insert own mistake logs') THEN
        CREATE POLICY "Users can insert own mistake logs"
            ON public.mistake_logs FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 2. MISTAKE STATS VIEW
-- ============================================
DROP VIEW IF EXISTS public.mistake_stats CASCADE;

CREATE VIEW public.mistake_stats AS
WITH mistake_counts AS (
    SELECT
        user_id,
        question_id,
        COUNT(*) as mistake_count,
        MAX(created_at) as last_mistake_at
    FROM public.mistake_logs
    GROUP BY user_id, question_id
),
correct_after_mistake AS (
    SELECT
        mc.user_id,
        mc.question_id,
        COUNT(pa.id) as correct_after_last_mistake
    FROM mistake_counts mc
    LEFT JOIN public.practice_sessions ps ON ps.user_id = mc.user_id
    LEFT JOIN public.practice_answers pa ON pa.session_id = ps.id 
        AND pa.question_id = mc.question_id
        AND pa.is_correct = true
        AND pa.created_at > mc.last_mistake_at
    GROUP BY mc.user_id, mc.question_id
)
SELECT
    mc.user_id,
    mc.question_id,
    mc.mistake_count,
    COALESCE(cam.correct_after_last_mistake, 0) as correct_after_last_mistake,
    mc.last_mistake_at,
    CASE
        WHEN mc.mistake_count >= 5 THEN 'critical'
        WHEN mc.mistake_count >= 3 THEN 'high'
        WHEN mc.mistake_count >= 2 THEN 'medium'
        ELSE 'low'
    END as severity_level,
    LEAST(100, (
        mc.mistake_count * 15 + 
        CASE
            WHEN mc.last_mistake_at > NOW() - INTERVAL '7 days' THEN 25
            WHEN mc.last_mistake_at > NOW() - INTERVAL '30 days' THEN 15
            ELSE 5
        END
    )) as severity_score
FROM mistake_counts mc
LEFT JOIN correct_after_mistake cam ON mc.user_id = cam.user_id AND mc.question_id = cam.question_id;

-- ============================================
-- 3. AI FEEDBACK CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_feedback_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type text NOT NULL CHECK (feedback_type IN ('overall', 'category', 'subject')),
    scope_value text,
    feedback_text text NOT NULL,
    pattern_analysis text,
    root_causes text,
    learning_gaps text,
    action_plan text,
    practice_focus text,
    mistake_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    UNIQUE (user_id, feedback_type, scope_value)
);

-- RLS for ai_feedback_cache
ALTER TABLE public.ai_feedback_cache ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_feedback_cache' AND policyname = 'Users can view own AI feedback') THEN
        CREATE POLICY "Users can view own AI feedback"
            ON public.ai_feedback_cache FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_feedback_cache' AND policyname = 'Users can insert own AI feedback') THEN
        CREATE POLICY "Users can insert own AI feedback"
            ON public.ai_feedback_cache FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_feedback_cache' AND policyname = 'Users can update own AI feedback') THEN
        CREATE POLICY "Users can update own AI feedback"
            ON public.ai_feedback_cache FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_feedback_cache' AND policyname = 'Users can delete own AI feedback') THEN
        CREATE POLICY "Users can delete own AI feedback"
            ON public.ai_feedback_cache FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS public.calculate_mistake_severity(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_high_priority_mistakes(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.calculate_mistake_severity(
    p_user_id uuid,
    p_question_id uuid
)
RETURNS TABLE (
    severity_level text,
    severity_score integer,
    mistake_count bigint,
    correct_after_last_mistake bigint,
    last_attempt timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.severity_level,
        ms.severity_score,
        ms.mistake_count,
        ms.correct_after_last_mistake,
        ms.last_mistake_at
    FROM public.mistake_stats ms
    WHERE ms.user_id = p_user_id
      AND ms.question_id = p_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_high_priority_mistakes(
    p_user_id uuid,
    p_limit integer DEFAULT 50,
    p_min_score integer DEFAULT 30
)
RETURNS TABLE (
    question_id uuid,
    severity_level text,
    severity_score integer,
    mistake_count bigint,
    correct_after_last_mistake bigint,
    last_mistake_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.question_id,
        ms.severity_level,
        ms.severity_score,
        ms.mistake_count,
        ms.correct_after_last_mistake,
        ms.last_mistake_at
    FROM public.mistake_stats ms
    WHERE ms.user_id = p_user_id
      AND ms.severity_score >= p_min_score
    ORDER BY ms.severity_score DESC, ms.last_mistake_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_mistake_logs_user_id ON public.mistake_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_question_id ON public.mistake_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_user_question ON public.mistake_logs(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_topic ON public.mistake_logs(topic);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_created_at ON public.mistake_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_context ON public.mistake_logs(context);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_cache_user_type ON public.ai_feedback_cache(user_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_cache_expires ON public.ai_feedback_cache(expires_at);
