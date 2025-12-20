import { supabase } from "@/integrations/supabase/client";

export interface EmulatorQuestion {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    subject: string;
    unit: string;
}

export type QuestionSubject = 'Math' | 'Analytical' | 'English';

/**
 * Fetch a random question from Supabase for the emulator
 * @param subject - The subject to fetch from (Math, Analytical, English)
 * @returns A random question or null if none found
 */
export const fetchEmulatorQuestion = async (
    subject: QuestionSubject = 'Math'
): Promise<EmulatorQuestion | null> => {
    try {
        // Fetch questions from the specified subject
        const { data, error } = await supabase
            .from('questions')
            .select('id, question_text, options, correct_answer, subject, unit_id')
            .eq('subject', subject)
            .limit(50); // Fetch batch for randomization

        if (error) {
            console.error('Error fetching emulator question:', error);
            return null;
        }

        if (!data || data.length === 0) {
            console.warn(`No questions found for subject: ${subject}`);
            return null;
        }

        // Select a random question from the batch
        const randomIndex = Math.floor(Math.random() * data.length);
        const question = data[randomIndex];

        // Parse options array (should be length 4)
        const options = question.options || [];
        if (options.length < 4) {
            console.error('Question has less than 4 options:', question);
            return null;
        }

        // Parse correct_answer to get the option letter
        const correctIndex = parseInt(question.correct_answer || '0', 10);
        const correctLetter = ['A', 'B', 'C', 'D'][correctIndex] as 'A' | 'B' | 'C' | 'D';

        return {
            id: question.id,
            question_text: question.question_text,
            option_a: options[0] || '',
            option_b: options[1] || '',
            option_c: options[2] || '',
            option_d: options[3] || '',
            correct_option: correctLetter,
            subject: question.subject || 'Math',
            unit: question.unit_id || 'Unknown',
        };
    } catch (err) {
        console.error('Exception fetching emulator question:', err);
        return null;
    }
};

/**
 * Map memory value to subject type
 * Based on MEMORY_ADDRESSES.QUESTION_TYPE
 * 1 = Math, 2 = Analytical, 3 = English
 */
export const getSubjectFromMemoryValue = (value: number): QuestionSubject => {
    switch (value) {
        case 1:
            return 'Math';
        case 2:
            return 'Analytical';
        case 3:
            return 'English';
        default:
            return 'Math'; // Default to Math
    }
};
