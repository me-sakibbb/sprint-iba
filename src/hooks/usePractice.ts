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
    practiceMode?: 'normal' | 'mistakes'; // New: practice normal questions or mistakes only
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
            let selectedQuestions: Question[] = [];

            // If practicing mistakes, fetch questions from mistake logs
            if (config.practiceMode === 'mistakes') {
                // Get mistake question IDs
                const { data: mistakesData, error: rpcError } = await supabase
                    .rpc('get_high_priority_mistakes', {
                        p_user_id: user.id,
                        p_limit: 100,
                        p_min_score: 0
                    });

                let mistakeQuestionIds: string[] = [];
                let mistakeStats: any[] = [];

                if (rpcError) {
                    console.error(`RPC Error for user ${user.id}, falling back to direct query:`, rpcError);
                    // Fallback: Get all unique question IDs from mistake_logs
                    const { data: directMistakes, error: directError } = await supabase
                        .from('mistake_logs')
                        .select('question_id')
                        .eq('user_id', user.id);

                    if (directError) {
                        console.error('Direct query fallback also failed:', directError);
                        throw directError;
                    }

                    if (!directMistakes || directMistakes.length === 0) {
                        throw new Error("You haven't made any mistakes yet! Go practice some new questions first.");
                    }

                    // Get unique IDs
                    mistakeQuestionIds = Array.from(new Set(directMistakes.map(m => m.question_id)));
                } else if (mistakesData && mistakesData.length > 0) {
                    mistakeQuestionIds = mistakesData.map((m: any) => m.question_id);
                    mistakeStats = mistakesData;
                } else {
                    throw new Error("You haven't made any mistakes yet! Go practice some new questions first.");
                }

                if (mistakeQuestionIds.length > 0) {
                    // Fetch full question objects
                    let query = supabase
                        .from('questions')
                        .select('*')
                        .in('id', mistakeQuestionIds);

                    // Apply subject filter
                    if (config.subjects.length > 0 && !config.subjects.includes('Overall')) {
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

                    const { data: questions, error: fetchError } = await query;

                    if (fetchError) throw fetchError;

                    // Sort by severity score (if available) or randomly
                    const sortedQuestions = questions?.sort((a, b) => {
                        const severityA = mistakeStats.find((m: any) => m.question_id === a.id)?.severity_score || 0;
                        const severityB = mistakeStats.find((m: any) => m.question_id === b.id)?.severity_score || 0;
                        return severityB - severityA;
                    });

                    selectedQuestions = (sortedQuestions || []).slice(0, config.questionCount) as Question[];

                    if (selectedQuestions.length === 0) {
                        throw new Error('No mistakes found matching your selected topics.');
                    }
                }
            } else {
                // Normal practice mode: Get questions user hasn't answered yet
                const { data: answeredQuestions } = await supabase
                    .from('user_progress')
                    .select('question_id')
                    .eq('user_id', user.id);

                const answeredIds = new Set(answeredQuestions?.map((p: any) => p.question_id) || []);

                // Build query for questions
                let query = supabase
                    .from('questions')
                    .select('*')

                // Filter by subjects/topics
                if (config.subjects.length > 0 && !config.subjects.includes('Overall')) {
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
                selectedQuestions = shuffled.slice(0, config.questionCount) as Question[];
            }

            if (selectedQuestions.length === 0) {
                throw new Error('No questions available for the selected filters. Try different topics or reset your progress.');
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
                questions: selectedQuestions,
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

        // Log mistake if incorrect
        if (!isCorrect) {
            const { error: mistakeError } = await supabase.from('mistake_logs').insert({
                user_id: user.id,
                question_id: currentQuestion.id,
                user_answer: answer,
                correct_answer: currentQuestion.correct_answer,
                context: 'practice',
                session_id: state.session.id,
                time_taken_seconds: timeTaken,
                topic: currentQuestion.topic,
                subtopic: currentQuestion.subtopic,
                difficulty: currentQuestion.difficulty,
            } as any);

            if (mistakeError) {
                console.error('Error logging mistake:', mistakeError);
            }
        }

        // Update user_progress to track this question as answered
        const { error: progressError } = await supabase.from('user_progress').upsert({
            user_id: user.id,
            question_id: currentQuestion.id,
            is_correct: isCorrect,
        } as any, { onConflict: 'user_id,question_id' });

        if (progressError) {
            console.error('Error updating user progress:', progressError);
        }

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
