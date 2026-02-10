
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { awardPracticeAnswerPoints, awardSessionCompletionBonus } from '@/services/practicePointsService';
import { toast } from 'sonner';
import { checkIsCorrect } from '@/utils/answerValidation';
import { ensureNonNegative } from '@/utils/pointCalculations';
import { getUserStreak, updateLoginStreak, getStreakStats } from '@/services/streakService';

type Question = Tables<'questions'>;
type PracticeSession = Tables<'practice_sessions'>;

interface PracticeConfig {
    mode: 'timed' | 'untimed';
    timePerQuestion?: number; // seconds
    subjects: string[];
    questionCount: number;
    practiceMode?: 'normal' | 'mistakes'; // New: practice normal questions or mistakes only
    feedbackMode?: 'immediate' | 'deferred'; // Show answers immediately or at the end
}

interface PracticeState {
    session: PracticeSession | null;
    questions: Question[];
    currentIndex: number;
    answers: Record<string, string>; // questionId -> answer
    timeRemaining: number | null;
    isComplete: boolean;
    feedbackMode: 'immediate' | 'deferred';
    totalVpEarned: number; // Track VP during session
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
        feedbackMode: 'deferred',
        totalVpEarned: 0,
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
                    console.error(`RPC Error for user ${user.id}, falling back to direct query: `, rpcError);
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
                            query = query.or(`topic.in.(${subjects.join(',')}), subtopic.in.(${subtopics.join(',')})`);
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
                        query = query.or(`topic.in.(${subjects.join(',')}), subtopic.in.(${subtopics.join(',')})`);
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
                feedbackMode: config.feedbackMode || 'deferred',
                totalVpEarned: 0,
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
        const isCorrect = checkIsCorrect(currentQuestion.correct_answer, answer, currentQuestion.options);

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

        // Award points for the answer
        try {
            const result = await awardPracticeAnswerPoints(
                user.id,
                currentQuestion.id,
                answer,
                currentQuestion.correct_answer || '',
                currentQuestion.options,
                currentQuestion.difficulty as 'easy' | 'medium' | 'hard' | null,
                timeTaken,
                state.session.time_per_question || undefined
            );

            // Track VP earned during session
            setState(prev => ({
                ...prev,
                totalVpEarned: prev.totalVpEarned + result.vpAwarded,
            }));

            // Show toast notification ONLY in immediate feedback mode
            if (state.feedbackMode === 'immediate') {
                if (result.isCorrect) {
                    let message = `Correct! + ${result.vpAwarded} VP`;
                    if (result.speedBonus && result.speedBonus > 0) {
                        message += ` (+${result.speedBonus} speed bonus)`;
                    }
                    toast.success(message);
                } else if (result.vpAwarded !== 0) {
                    toast.error(`Wrong answer.${result.vpAwarded} VP`);
                }
            }
        } catch (error) {
            console.error('Error awarding points:', error);
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

        // Award session completion bonus and update practice streak
        if (user) {
            try {
                const bonusResult = await awardSessionCompletionBonus(
                    user.id,
                    state.session.id,
                    correctCount,
                    state.questions.length
                );

                // Show completion message with bonuses
                // Calculate total VP including bonuses and answers
                const totalVP = state.totalVpEarned + bonusResult.sessionBonus + bonusResult.perfectBonus + bonusResult.highScoreBonus + bonusResult.streakBonus;

                // Show completion message
                let bonusMessage: string;

                if (state.feedbackMode === 'deferred') {
                    // Show total VP earned in deferred mode
                    bonusMessage = `Session Complete! Total VP: ${totalVP > 0 ? '+' : ''}${totalVP} `;
                } else {
                    // Show only bonuses in immediate mode (answers already shown)
                    bonusMessage = `Session Complete! Bonuses: +${bonusResult.sessionBonus + bonusResult.perfectBonus + bonusResult.highScoreBonus} VP`;
                }

                if (bonusResult.perfectBonus > 0) {
                    bonusMessage += `\n🎉 Perfect Score! + ${bonusResult.perfectBonus} VP`;
                } else if (bonusResult.highScoreBonus > 0) {
                    bonusMessage += `\n⭐ High Score! + ${bonusResult.highScoreBonus} VP`;
                }

                if (bonusResult.streakBonus > 0) {
                    bonusMessage += `\n🔥 ${bonusResult.streakCount} Day Practice Streak! + ${bonusResult.streakBonus} VP`;
                }

                toast.success(bonusMessage, { duration: 5000 });
            } catch (error) {
                console.error('Error awarding session bonus:', error);
            }
        }

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
            feedbackMode: 'deferred',
            totalVpEarned: 0,
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
        feedbackMode: state.feedbackMode,
        totalVpEarned: state.totalVpEarned,
        startSession,
        submitAnswer,
        nextQuestion,
        completeSession,
        resetSession,
        setTimeRemaining: (time: number | null) => setState(prev => ({ ...prev, timeRemaining: time })),
    };
}
