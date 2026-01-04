import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Question = Tables<'questions'>;
type PracticeSession = Tables<'practice_sessions'>;

interface PracticeConfig {
    mode: 'timed' | 'untimed';
    timePerQuestion?: number; // seconds
    subjects: string[];
    questionCount: number;
}

interface PracticeState {
    session: PracticeSession | null;
    questions: Question[];
    currentIndex: number;
    answers: Record<string, string>; // questionId -> answer
    timeRemaining: number | null;
    isComplete: boolean;
}

export function usePractice() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<PracticeState>({
        session: null,
        questions: [],
        currentIndex: 0,
        answers: {},
        timeRemaining: null,
        isComplete: false,
    });

    // Fetch available topics grouped by subject
    const [topics, setTopics] = useState<Record<string, string[]>>({});

    useEffect(() => {
        async function fetchTopics() {
            const { data, error } = await supabase
                .from('questions')
                .select('topic, subtopic')
                .eq('is_verified', true);

            if (error) {
                console.error('Error fetching topics:', error);
                return;
            }

            const grouped: Record<string, Set<string>> = {};
            data?.forEach((q: any) => {
                const subject = q.topic || 'Other';
                const subtopic = q.subtopic || 'General';
                if (!grouped[subject]) grouped[subject] = new Set();
                grouped[subject].add(subtopic);
            });

            const result: Record<string, string[]> = {};
            Object.entries(grouped).forEach(([subject, subtopics]) => {
                result[subject] = Array.from(subtopics);
            });
            setTopics(result);
        }

        fetchTopics();
    }, []);

    // Start a new practice session
    const startSession = useCallback(async (config: PracticeConfig) => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // Get questions user hasn't answered yet
            const { data: answeredQuestions } = await supabase
                .from('user_progress')
                .select('question_id')
                .eq('user_id', user.id);

            const answeredIds = new Set(answeredQuestions?.map((p: any) => p.question_id) || []);

            // Build query for questions
            let query = supabase
                .from('questions')
                .select('*')
                .eq('is_verified', true);

            // Filter by subjects/topics
            if (config.subjects.length > 0 && !config.subjects.includes('Overall')) {
                // Check if selecting whole subjects or specific subtopics
                const subjects = config.subjects.filter(s => ['Math', 'English', 'Analytical'].includes(s));
                const subtopics = config.subjects.filter(s => !['Math', 'English', 'Analytical', 'Overall'].includes(s));

                if (subjects.length > 0 && subtopics.length > 0) {
                    query = query.or(`topic.in.(${subjects.join(',')}),subtopic.in.(${subtopics.join(',')})`);
                } else if (subjects.length > 0) {
                    query = query.in('topic', subjects);
                } else if (subtopics.length > 0) {
                    query = query.in('subtopic', subtopics);
                }
            }

            const { data: allQuestions, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Filter out already answered questions
            const unansweredQuestions = allQuestions?.filter((q: any) => !answeredIds.has(q.id)) || [];

            // Shuffle and limit
            const shuffled = unansweredQuestions.sort(() => Math.random() - 0.5);
            const selectedQuestions = shuffled.slice(0, config.questionCount);

            if (selectedQuestions.length === 0) {
                throw new Error('No new questions available for the selected topics. Try different topics or reset your progress.');
            }

            // Create session in database
            const { data: session, error: sessionError } = await supabase
                .from('practice_sessions')
                .insert({
                    user_id: user.id,
                    mode: config.mode,
                    time_per_question: config.mode === 'timed' ? config.timePerQuestion : null,
                    subjects: config.subjects,
                    total_questions: selectedQuestions.length,
                    correct_count: 0,
                } as any)
                .select()
                .single();

            if (sessionError) throw sessionError;

            setState({
                session: session as PracticeSession,
                questions: selectedQuestions as Question[],
                currentIndex: 0,
                answers: {},
                timeRemaining: config.mode === 'timed' ? config.timePerQuestion || 60 : null,
                isComplete: false,
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Submit answer for current question
    const submitAnswer = useCallback(async (answer: string, timeTaken?: number) => {
        if (!state.session || !user) return;

        const currentQuestion = state.questions[state.currentIndex];
        const isCorrect = currentQuestion.correct_answer === answer;

        // Save to practice_answers
        await supabase.from('practice_answers').insert({
            session_id: state.session.id,
            question_id: currentQuestion.id,
            user_answer: answer,
            is_correct: isCorrect,
            time_taken_seconds: timeTaken,
        } as any);

        // Update user_progress to track this question as answered
        await supabase.from('user_progress').upsert({
            user_id: user.id,
            question_id: currentQuestion.id,
            is_correct: isCorrect,
        } as any, { onConflict: 'user_id,question_id' });

        // Update local state
        setState(prev => ({
            ...prev,
            answers: { ...prev.answers, [currentQuestion.id]: answer },
        }));

    }, [state.session, state.questions, state.currentIndex, user]);

    // Move to next question
    const nextQuestion = useCallback(() => {
        setState(prev => {
            const nextIndex = prev.currentIndex + 1;
            if (nextIndex >= prev.questions.length) {
                return { ...prev, isComplete: true };
            }
            return {
                ...prev,
                currentIndex: nextIndex,
                timeRemaining: prev.session?.mode === 'timed' ? prev.session.time_per_question : null,
            };
        });
    }, []);

    // Complete session
    const completeSession = useCallback(async () => {
        if (!state.session) return;

        // Calculate score
        let correctCount = 0;
        state.questions.forEach(q => {
            if (q.correct_answer === state.answers[q.id]) {
                correctCount++;
            }
        });

        // Update session in database
        await supabase
            .from('practice_sessions')
            .update({
                correct_count: correctCount,
                completed_at: new Date().toISOString(),
            } as any)
            .eq('id', state.session.id);

        setState(prev => ({
            ...prev,
            isComplete: true,
            session: prev.session ? { ...prev.session, correct_count: correctCount } : null,
        }));

    }, [state.session, state.questions, state.answers]);

    // Reset session
    const resetSession = useCallback(() => {
        setState({
            session: null,
            questions: [],
            currentIndex: 0,
            answers: {},
            timeRemaining: null,
            isComplete: false,
        });
    }, []);

    return {
        loading,
        error,
        topics,
        session: state.session,
        questions: state.questions,
        currentQuestion: state.questions[state.currentIndex],
        currentIndex: state.currentIndex,
        answers: state.answers,
        timeRemaining: state.timeRemaining,
        isComplete: state.isComplete,
        startSession,
        submitAnswer,
        nextQuestion,
        completeSession,
        resetSession,
        setTimeRemaining: (time: number | null) => setState(prev => ({ ...prev, timeRemaining: time })),
    };
}
