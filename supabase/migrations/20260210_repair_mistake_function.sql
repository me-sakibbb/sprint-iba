-- Force update of get_high_priority_mistakes to ensure it has 3 parameters and correct types
-- This also drops any existing overloads with different parameter counts

-- First, drop ALL possible versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_high_priority_mistakes(uuid);
DROP FUNCTION IF EXISTS public.get_high_priority_mistakes(uuid, integer);
DROP FUNCTION IF EXISTS public.get_high_priority_mistakes(uuid, integer, integer);

-- Now create the definitive version
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
        ms.severity_score::integer, -- Cast to integer to match return type
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

-- Repair calculate_mistake_severity
DROP FUNCTION IF EXISTS public.calculate_mistake_severity(uuid, uuid);

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
        ms.severity_score::integer,
        ms.mistake_count,
        ms.correct_after_last_mistake,
        ms.last_mistake_at
    FROM public.mistake_stats ms
    WHERE ms.user_id = p_user_id
      AND ms.question_id = p_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
