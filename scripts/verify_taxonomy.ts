
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlojoepzhomxyawtmpwu.supabase.co';
const supabaseKey = 'sb_publishable_ZjaI5lEMxqQnOAYkSDWlgg_CkJJ_sQ2'; // using anon key from .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaxonomy() {
    console.log('Checking questions table for taxonomy migration needs...');

    // refined query to see if we have unmigrated data
    const { count: totalQuestions, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting questions:', countError);
        return;
    }

    const { count: missingSubjectId, error: subjectError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .is('subject_id', null)
        .not('topic', 'is', null); // "topic" column holds the Subject name in old schema

    if (subjectError) {
        console.error('Error counting missing subject_id:', subjectError);
    }

    const { count: missingTopicId, error: topicError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .is('topic_id', null)
        .not('subtopic', 'is', null); // "subtopic" column holds the Topic name in old schema

    if (topicError) {
        console.error('Error counting missing topic_id:', topicError);
    }

    console.log(`Total Questions: ${totalQuestions}`);
    console.log(`Questions with Topic (Subject) string but NO subject_id: ${missingSubjectId}`);
    console.log(`Questions with Subtopic (Topic) string but NO topic_id: ${missingTopicId}`);

    if ((missingSubjectId || 0) > 0 || (missingTopicId || 0) > 0) {
        console.log('Migration IS REQUIRED.');
    } else {
        console.log('No migration needed. Data seems populated.');
    }
}

checkTaxonomy();
