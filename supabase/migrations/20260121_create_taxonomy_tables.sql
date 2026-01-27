-- Create taxonomy tables for subject/topic/subtopic hierarchy
-- This enables organized categorization of questions

-- Create or replace the updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Subjects (top level)
CREATE TABLE IF NOT EXISTS public.subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Topics (within subjects)
CREATE TABLE IF NOT EXISTS public.topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(subject_id, name)
);

-- Subtopics (within topics)
CREATE TABLE IF NOT EXISTS public.subtopics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(topic_id, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON public.subtopics(topic_id);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only authenticated users can write
CREATE POLICY "Anyone can view subjects"
    ON public.subjects FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert subjects"
    ON public.subjects FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update subjects"
    ON public.subjects FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete subjects"
    ON public.subjects FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can view topics"
    ON public.topics FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert topics"
    ON public.topics FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update topics"
    ON public.topics FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete topics"
    ON public.topics FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can view subtopics"
    ON public.subtopics FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert subtopics"
    ON public.subtopics FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update subtopics"
    ON public.subtopics FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete subtopics"
    ON public.subtopics FOR DELETE
    TO authenticated
    USING (true);

-- Add updated_at triggers
CREATE TRIGGER on_subjects_updated
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_topics_updated
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_subtopics_updated
    BEFORE UPDATE ON public.subtopics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert default "Others" category for unmapped questions
INSERT INTO public.subjects (id, name, description)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Others',
    'Questions that do not fit into any defined category'
) ON CONFLICT (name) DO NOTHING;

INSERT INTO public.topics (id, subject_id, name, description)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Uncategorized',
    'Topics not yet categorized'
) ON CONFLICT (subject_id, name) DO NOTHING;

INSERT INTO public.subtopics (id, topic_id, name, description)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'General',
    'General uncategorized content'
) ON CONFLICT (topic_id, name) DO NOTHING;
