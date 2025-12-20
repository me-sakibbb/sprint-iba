
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlojoepzhomxyawtmpwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsb2pvZXB6aG9teHlhd3RtcHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NjUxMjQsImV4cCI6MjA4MDA0MTEyNH0.FyJPPbm4263DVOk0TqwH-THNP9NeMAajcNhALNInga4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestQuestion() {
    console.log('Searching for test questions...');

    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .or('question_text.ilike.%test%,subtopic.ilike.%test%');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`Found ${data.length} potential test questions.`);

    for (const q of data) {
        console.log(`ID: ${q.id}, Text: ${q.question_text}, Subtopic: ${q.subtopic}`);

        // logic to identify the specific test question mentioned by user
        // "delete the test question from the database as shown in generla math unit"
        // It likely has "test" in the text.

        if (q.question_text.toLowerCase().includes('test') || q.subtopic.toLowerCase().includes('test')) {
            console.log(`Deleting question ${q.id}...`);
            const { error: deleteError } = await supabase
                .from('questions')
                .delete()
                .eq('id', q.id);

            if (deleteError) {
                console.error('Error deleting question:', deleteError);
            } else {
                console.log('Successfully deleted question.');
            }
        }
    }
}

deleteTestQuestion();
