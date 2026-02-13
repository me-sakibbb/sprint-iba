import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useStudyProgress() {
    /**
     * Record a user's answer to a question in user_progress
     * @param userId - The user ID
     * @param questionId - The question ID
     * @param isCorrect - Whether the answer was correct
     */
    const recordProgress = async (
        userId: string,
        questionId: string,
        isCorrect: boolean
    ): Promise<{ error: any | null }> => {
        try {
            const { error } = await (supabase as any).from('user_progress').upsert(
                {
                    user_id: userId,
                    question_id: questionId,
                    is_correct: isCorrect,
                    answered_at: new Date().toISOString(),
                },
                { onConflict: 'user_id, question_id' }
            );

            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            console.error('Error recording progress:', error);
            return { error };
        }
    };

    /**
     * Log a mistake in mistake_logs
     * @param params - Mistake details
     */
    const logMistake = async (params: {
        userId: string;
        questionId: string;
        userAnswer: string;
        correctAnswer: string;
        context: string;
        topic: string | null;
        subtopic: string | null;
        difficulty: string | null;
    }): Promise<{ error: any | null }> => {
        try {
            const { error } = await (supabase as any).from('mistake_logs').insert({
                user_id: params.userId,
                question_id: params.questionId,
                user_answer: params.userAnswer,
                correct_answer: params.correctAnswer,
                context: params.context,
                topic: params.topic,
                subtopic: params.subtopic,
                difficulty: params.difficulty,
            });

            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            console.error('Error logging mistake:', error);
            return { error };
        }
    };

    /**
     * Record answer and log mistake if incorrect (combo method for convenience)
     * @param params - Combined params for both operations
     */
    const recordAnswerAndMistake = async (params: {
        userId: string;
        questionId: string;
        isCorrect: boolean;
        userAnswer: string;
        correctAnswer: string;
        context: string;
        topic: string | null;
        subtopic: string | null;
        difficulty: string | null;
    }): Promise<{ error: any | null }> => {
        // Record progress
        const { error: progressError } = await recordProgress(
            params.userId,
            params.questionId,
            params.isCorrect
        );

        if (progressError) return { error: progressError };

        // Log mistake if incorrect
        if (!params.isCorrect) {
            const { error: mistakeError } = await logMistake({
                userId: params.userId,
                questionId: params.questionId,
                userAnswer: params.userAnswer,
                correctAnswer: params.correctAnswer,
                context: params.context,
                topic: params.topic,
                subtopic: params.subtopic,
                difficulty: params.difficulty,
            });

            if (mistakeError) return { error: mistakeError };
        }

        return { error: null };
    };

    return {
        recordProgress,
        logMistake,
        recordAnswerAndMistake,
    };
}
