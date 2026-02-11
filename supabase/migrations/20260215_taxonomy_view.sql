-- View to aggregate question counts for study topics
CREATE OR REPLACE VIEW study_topics_with_counts AS
SELECT 
    st.*,
    (
        SELECT COUNT(*)
        FROM questions q
        WHERE 
            q.subject_id = st.id OR 
            q.topic_id = st.id OR 
            q.subtopic_id = st.id
    ) as question_count,
    (
        SELECT COUNT(*)
        FROM study_topics child
        WHERE child.parent_id = st.id
    ) as child_count
FROM study_topics st;
