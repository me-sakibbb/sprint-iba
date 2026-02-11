-- 1. Clean up invalid data that violates the new constraints
-- This sets any subject_id/topic_id/subtopic_id to NULL if it doesn't exist in study_topics
UPDATE questions 
SET subject_id = NULL 
WHERE subject_id IS NOT NULL 
AND subject_id NOT IN (SELECT id FROM study_topics);

UPDATE questions 
SET topic_id = NULL 
WHERE topic_id IS NOT NULL 
AND topic_id NOT IN (SELECT id FROM study_topics);

UPDATE questions 
SET subtopic_id = NULL 
WHERE subtopic_id IS NOT NULL 
AND subtopic_id NOT IN (SELECT id FROM study_topics);

-- 2. Drop old constraints (safely)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'questions_subject_id_fkey') THEN
        ALTER TABLE questions DROP CONSTRAINT questions_subject_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'questions_topic_id_fkey') THEN
        ALTER TABLE questions DROP CONSTRAINT questions_topic_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'questions_subtopic_id_fkey') THEN
        ALTER TABLE questions DROP CONSTRAINT questions_subtopic_id_fkey;
    END IF;
END $$;

-- 3. Add new constraints referencing study_topics
ALTER TABLE questions ADD CONSTRAINT questions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES study_topics(id) ON DELETE SET NULL;
ALTER TABLE questions ADD CONSTRAINT questions_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE SET NULL;
ALTER TABLE questions ADD CONSTRAINT questions_subtopic_id_fkey FOREIGN KEY (subtopic_id) REFERENCES study_topics(id) ON DELETE SET NULL;
