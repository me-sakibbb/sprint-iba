import { supabase } from "@/integrations/supabase/client";

export interface MathQuestion {
    id: string;
    text: string;
    answer: string; // We might need to parse this or store it
    options?: string[];
}

export const getRandomMathQuestion = async (): Promise<MathQuestion | null> => {
    try {
        // Fetch a random math question
        // Since we don't have a 'random()' function easily in Supabase without RPC,
        // we'll fetch a batch and pick one.
        const { data, error } = await supabase
            .from('questions')
            .select('id, question_text, correct_answer')
            .eq('topic', 'Math')
            .limit(20);

        if (error) {
            console.error('Error fetching questions:', error);
            return null;
        }

        if (data && data.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.length);
            const q = data[randomIndex];
            return {
                id: q.id,
                text: q.question_text,
                answer: q.correct_answer
            };
        }
        return null;
    } catch (err) {
        console.error('Exception fetching questions:', err);
        return null;
    }
};
