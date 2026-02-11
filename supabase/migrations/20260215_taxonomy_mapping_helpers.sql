
-- Function to fetch unmapped questions bypassing RLS
DROP FUNCTION IF EXISTS get_unmapped_questions(int);

CREATE OR REPLACE FUNCTION get_unmapped_questions(limit_count int)
RETURNS TABLE (
  id uuid,
  question_text text,
  options jsonb,
  subject_id uuid,
  topic_id uuid,
  subtopic_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.question_text, q.options, q.subject_id, q.topic_id, q.subtopic_id
  FROM questions q
  -- WHERE q.subject_id IS NULL -- Fetch all for now to check if classification is correct
  LIMIT limit_count;
END;
$$;

-- Grant execution to anon (public) and authenticated users
GRANT EXECUTE ON FUNCTION get_unmapped_questions(int) TO anon, authenticated, service_role;


-- Function to fetch all questions bypassing RLS
DROP FUNCTION IF EXISTS get_all_questions_for_mapping(int, int);

CREATE OR REPLACE FUNCTION get_all_questions_for_mapping(limit_count int, offset_count int)
RETURNS TABLE (
  id uuid,
  question_text text,
  options jsonb,
  subject_id uuid,
  topic_id uuid,
  subtopic_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.question_text, q.options, q.subject_id, q.topic_id, q.subtopic_id
  FROM questions q
  ORDER BY q.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_questions_for_mapping(int, int) TO anon, authenticated, service_role;


-- Function to update question taxonomy bypassing RLS
CREATE OR REPLACE FUNCTION update_question_taxonomy(
  p_question_id uuid,
  p_subject_id uuid,
  p_topic_id uuid,
  p_subtopic_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE questions
  SET 
    subject_id = p_subject_id,
    topic_id = p_topic_id,
    subtopic_id = p_subtopic_id
  WHERE id = p_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_question_taxonomy(uuid, uuid, uuid, uuid) TO anon, authenticated, service_role;
