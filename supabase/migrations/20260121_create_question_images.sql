-- Create question_images junction table for multiple images per question
-- Supports ordering and descriptions for each image

CREATE TABLE IF NOT EXISTS public.question_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    image_order int NOT NULL DEFAULT 0,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_question_images_question_id ON public.question_images(question_id);
CREATE INDEX IF NOT EXISTS idx_question_images_order ON public.question_images(question_id, image_order);

-- Enable RLS
ALTER TABLE public.question_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view question images"
    ON public.question_images FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert question images"
    ON public.question_images FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update question images"
    ON public.question_images FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete question images"
    ON public.question_images FOR DELETE
    TO authenticated
    USING (true);

-- Migrate existing image_url data from questions table
INSERT INTO public.question_images (question_id, image_url, image_order, description)
SELECT 
    id AS question_id,
    image_url,
    0 AS image_order,
    image_description AS description
FROM public.questions
WHERE image_url IS NOT NULL AND image_url != ''
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.question_images IS 'Stores multiple images per question with ordering and descriptions';
