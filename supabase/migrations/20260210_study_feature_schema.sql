-- =============================================
-- MY STUDY FEATURE — Database Schema
-- =============================================
-- Creates tables for structured study content:
--   study_topics: Admin-managed study topics/subtopics
--   study_materials: Notes, reading materials, links per topic
--   study_user_progress: Per-user progress tracking

-- =============================================
-- 1. STUDY TOPICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.study_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    icon_name text DEFAULT 'BookOpen',
    color text DEFAULT '#6366f1',
    parent_id uuid REFERENCES public.study_topics(id) ON DELETE SET NULL,
    topic_name text,           -- Maps to questions.topic for practice filtering
    subtopic_name text,        -- Maps to questions.subtopic for practice filtering
    sort_order int NOT NULL DEFAULT 0,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_topics_parent_id ON public.study_topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_study_topics_slug ON public.study_topics(slug);
CREATE INDEX IF NOT EXISTS idx_study_topics_sort_order ON public.study_topics(sort_order);
CREATE INDEX IF NOT EXISTS idx_study_topics_published ON public.study_topics(is_published);

-- RLS
ALTER TABLE public.study_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published study topics"
    ON public.study_topics FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert study topics"
    ON public.study_topics FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update study topics"
    ON public.study_topics FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete study topics"
    ON public.study_topics FOR DELETE
    TO authenticated
    USING (true);

-- Updated_at trigger
CREATE TRIGGER on_study_topics_updated
    BEFORE UPDATE ON public.study_topics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 2. STUDY MATERIALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.study_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    study_topic_id uuid NOT NULL REFERENCES public.study_topics(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text,              -- Markdown content
    type text NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'reading', 'link', 'video')),
    url text,                  -- External link for link/video types
    sort_order int NOT NULL DEFAULT 0,
    is_published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_materials_topic_id ON public.study_materials(study_topic_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_type ON public.study_materials(type);
CREATE INDEX IF NOT EXISTS idx_study_materials_sort_order ON public.study_materials(sort_order);

-- RLS
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view study materials"
    ON public.study_materials FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert study materials"
    ON public.study_materials FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update study materials"
    ON public.study_materials FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete study materials"
    ON public.study_materials FOR DELETE
    TO authenticated
    USING (true);

-- Updated_at trigger
CREATE TRIGGER on_study_materials_updated
    BEFORE UPDATE ON public.study_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 3. STUDY USER PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.study_user_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    study_topic_id uuid NOT NULL REFERENCES public.study_topics(id) ON DELETE CASCADE,
    materials_read text[] DEFAULT '{}',
    practice_attempted int DEFAULT 0,
    practice_correct int DEFAULT 0,
    is_completed boolean DEFAULT false,
    last_accessed_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, study_topic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_user_progress_user_id ON public.study_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_study_user_progress_topic_id ON public.study_user_progress(study_topic_id);

-- RLS
ALTER TABLE public.study_user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study progress"
    ON public.study_user_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study progress"
    ON public.study_user_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study progress"
    ON public.study_user_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study progress"
    ON public.study_user_progress FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER on_study_user_progress_updated
    BEFORE UPDATE ON public.study_user_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
