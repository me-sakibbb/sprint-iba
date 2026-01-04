-- Practice & Exam Schema Migration
-- Created: 2026-01-05

-- ============================================
-- PRACTICE SESSIONS TABLE
-- ============================================
CREATE TABLE public.practice_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode text NOT NULL CHECK (mode IN ('timed', 'untimed')),
    time_per_question integer, -- seconds, only for timed mode
    subjects text[] NOT NULL DEFAULT '{}',
    total_questions integer NOT NULL DEFAULT 0,
    correct_count integer NOT NULL DEFAULT 0,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

-- RLS for practice_sessions
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice sessions"
    ON public.practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
    ON public.practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
    ON public.practice_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- PRACTICE ANSWERS TABLE
-- ============================================
CREATE TABLE public.practice_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer text,
    is_correct boolean NOT NULL DEFAULT false,
    time_taken_seconds integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for practice_answers
ALTER TABLE public.practice_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice answers"
    ON public.practice_answers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.practice_sessions ps
        WHERE ps.id = practice_answers.session_id AND ps.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own practice answers"
    ON public.practice_answers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.practice_sessions ps
        WHERE ps.id = practice_answers.session_id AND ps.user_id = auth.uid()
    ));

-- ============================================
-- EXAMS TABLE
-- ============================================
CREATE TABLE public.exams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    type text NOT NULL CHECK (type IN ('mock', 'live')),
    question_ids uuid[] NOT NULL DEFAULT '{}',
    duration_minutes integer NOT NULL DEFAULT 60,
    start_time timestamptz, -- for live exams
    end_time timestamptz,   -- for live exams
    allow_retake boolean NOT NULL DEFAULT false,
    show_results_immediately boolean NOT NULL DEFAULT true,
    show_leaderboard boolean NOT NULL DEFAULT true,
    show_topic_breakdown boolean NOT NULL DEFAULT true,
    is_published boolean NOT NULL DEFAULT false,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published exams"
    ON public.exams FOR SELECT
    USING (is_published = true);

CREATE POLICY "Operators can view all exams"
    ON public.exams FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'operator'
    ));

CREATE POLICY "Operators can insert exams"
    ON public.exams FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'operator'
    ));

CREATE POLICY "Operators can update exams"
    ON public.exams FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'operator'
    ));

CREATE POLICY "Operators can delete exams"
    ON public.exams FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'operator'
    ));

-- ============================================
-- EXAM ATTEMPTS TABLE
-- ============================================
CREATE TABLE public.exam_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answers jsonb NOT NULL DEFAULT '{}', -- {question_id: user_answer}
    score integer NOT NULL DEFAULT 0,
    total_questions integer NOT NULL DEFAULT 0,
    started_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz,
    is_submitted boolean NOT NULL DEFAULT false,
    
    -- Prevent duplicate attempts unless retake is allowed
    UNIQUE (exam_id, user_id)
);

-- RLS for exam_attempts
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam attempts"
    ON public.exam_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view others attempts for leaderboard"
    ON public.exam_attempts FOR SELECT
    USING (
        is_submitted = true AND EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_attempts.exam_id AND e.show_leaderboard = true
        )
    );

CREATE POLICY "Users can insert own exam attempts"
    ON public.exam_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unsubmitted attempts"
    ON public.exam_attempts FOR UPDATE
    USING (auth.uid() = user_id AND is_submitted = false);

CREATE POLICY "Operators can view all exam attempts"
    ON public.exam_attempts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'operator'
    ));

-- ============================================
-- USER PROGRESS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    is_correct boolean NOT NULL DEFAULT false,
    answered_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (user_id, question_id)
);

-- RLS for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
    ON public.user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON public.user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON public.user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_session_id ON public.practice_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question_id ON public.practice_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_exams_type ON public.exams(type);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON public.exams(is_published);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_question_id ON public.user_progress(question_id);
