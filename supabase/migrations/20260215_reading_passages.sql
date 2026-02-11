-- Create reading_passages table
CREATE TABLE IF NOT EXISTS public.reading_passages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content text NOT NULL,
    image_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for reading_passages
ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reading passages"
    ON public.reading_passages FOR SELECT
    USING (true);

CREATE POLICY "Operators can manage reading passages"
    ON public.reading_passages FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.role = 'operator' OR p.role = 'admin')
    ));

-- Add passage_id to questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS passage_id uuid REFERENCES public.reading_passages(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_questions_passage_id ON public.questions(passage_id);
