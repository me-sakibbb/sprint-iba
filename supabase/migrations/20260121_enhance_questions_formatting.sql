-- Enhance questions table with taxonomy and formatting support
-- Adds subject/topic/subtopic mapping and Markdown-formatted text fields

-- Add taxonomy foreign keys to questions table
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE SET NULL;

-- Add formatted text columns (Markdown with LaTeX support)
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS question_text_formatted text,
ADD COLUMN IF NOT EXISTS options_formatted jsonb,
ADD COLUMN IF NOT EXISTS explanation_formatted text;

-- Create indexes for taxonomy lookups
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON public.questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_subtopic_id ON public.questions(subtopic_id);

-- Add comment explaining the formatted columns
COMMENT ON COLUMN public.questions.question_text_formatted IS 'Markdown-formatted question text with LaTeX math expressions';
COMMENT ON COLUMN public.questions.options_formatted IS 'JSONB array of Markdown-formatted option strings';
COMMENT ON COLUMN public.questions.explanation_formatted IS 'Markdown-formatted explanation with LaTeX support';

-- Migrate existing data: copy plain text to formatted fields for backwards compatibility
UPDATE public.questions
SET 
    question_text_formatted = question_text,
    explanation_formatted = explanation
WHERE question_text_formatted IS NULL;

-- For options, convert the array to JSONB if options_formatted is null
UPDATE public.questions
SET options_formatted = to_jsonb(options)
WHERE options_formatted IS NULL AND options IS NOT NULL;
