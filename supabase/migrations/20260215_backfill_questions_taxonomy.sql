-- Migration to backfill questions taxonomy IDs based on existing text columns
-- This assumes:
-- questions.topic maps to study_topics (Level 1 - Subject)
-- questions.subtopic maps to study_topics (Level 2 - Topic)

-- 1. Backfill subject_id
UPDATE questions q
SET subject_id = st.id
FROM study_topics st
WHERE q.topic = st.title
AND st.parent_id IS NULL
AND q.subject_id IS NULL;

-- 2. Backfill topic_id
-- We only match topics that are children of the assigned subject_id to avoid ambiguity
UPDATE questions q
SET topic_id = st.id
FROM study_topics st
WHERE q.subtopic = st.title
AND st.parent_id = q.subject_id
AND q.subject_id IS NOT NULL
AND q.topic_id IS NULL;

-- 3. In case existing 'subtopic' text actually mapped to Level 3 (Subtopic) in some cases,
-- strictly speaking the old schema was only 2 levels deep (topic -> subtopic).
-- If there are Level 3 matches, we could try to map them to subtopic_id, 
-- but we need a topic_id first. 
-- For now, we assume the old data fits into the first 2 levels of the new 3-level hierarchy.
