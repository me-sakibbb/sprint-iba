
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { awardPracticeAnswerPoints, awardSessionCompletionBonus } from '@/services/practicePointsService';
import { toast } from 'sonner';
import { checkIsCorrect } from '@/utils/answerValidation';

type Question = Tables<'questions'>;
type PracticeSession = Tables<'practice_sessions'>;

interface PracticeConfig {
    mode: 'timed' | 'untimed';
    timePerQuestion?: number; // seconds
    selectedIds: string[]; // IDs of selected subjects/topics/subtopics
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
    passages?: Record<string, any>; // id -> passage object
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
        passages: {},
    });

    // Start a new practice session
    const startSession = useCallback(async (config: PracticeConfig) => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            let selectedQuestions: Question[] = [];
            let passagesMap: Record<string, any> = {};

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
                        .select('question_id, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }); // Newest mistakes first

                    if (directError) {
                        console.error('Direct query fallback also failed:', directError);
                        throw directError;
                    }

                    if (!directMistakes || directMistakes.length === 0) {
                        throw new Error("You haven't made any mistakes yet! Go practice some new questions first.");
                    }

                    // Get unique IDs maintaining order
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

                    // Apply hierarchical filter
                    if (config.selectedIds.length > 0 && !config.selectedIds.includes('Overall')) {
                        const ids = config.selectedIds.join(',');
                        // Filter questions where subject_id OR topic_id OR subtopic_id matches any of the selected IDs
                        query = query.or(`subject_id.in.(${ids}),topic_id.in.(${ids}),subtopic_id.in.(${ids})`);
                    }

                    const { data: questions, error: fetchError } = await query;

                    if (fetchError) throw fetchError;

                    if (!questions || questions.length === 0) {
                        throw new Error('No mistakes found matching your selected topics.');
                    }

                    // Group by passage_id
                    const groups: Record<string, Question[]> = {};
                    const standalone: Question[] = [];

                    questions.forEach(q => {
                        if (q.passage_id) {
                            if (!groups[q.passage_id]) groups[q.passage_id] = [];
                            groups[q.passage_id].push(q);
                        } else {
                            standalone.push(q);
                        }
                    });

                    // Sort groups based on the *first* mistake encountered in that passage (using mistakeQuestionIds order)
                    // But within the group, sort questions serially (by id or some undefined "serial" order - usually creation or just accidental). 
                    // Better: sort by ID or keep them as returned by DB (usually insert order). Let's sort by ID to be deterministic.
                    Object.values(groups).forEach(group => {
                        group.sort((a, b) => a.question_text.localeCompare(b.question_text)); // Lexicographical sort as proxy for serial if no explicit order
                    });

                    // Reconstruct the list: Passages first? Or mix?
                    // User wants "Passage and all questions serially".
                    // Let's iterate through mistakeQuestionIds to determine Group Selection Order
                    const finalSelection: Question[] = [];
                    const processedPassages = new Set<string>();
                    const processedStandalone = new Set<string>();

                    // Filter relevant questions first to a map for quick lookup
                    const questionMap = new Map(questions.map(q => [q.id, q]));

                    mistakeQuestionIds.forEach(id => {
                        const q = questionMap.get(id);
                        if (!q) return;

                        if (q.passage_id) {
                            if (!processedPassages.has(q.passage_id)) {
                                processedPassages.add(q.passage_id);
                                // Add ALL mistaken questions for this passage
                                const group = groups[q.passage_id];
                                if (group) {
                                    finalSelection.push(...group);
                                }
                            }
                        } else {
                            if (!processedStandalone.has(q.id)) {
                                processedStandalone.add(q.id);
                                finalSelection.push(q);
                            }
                        }
                    });

                    selectedQuestions = finalSelection.slice(0, config.questionCount);
                }
            } else {
                // Normal practice mode
                const { data: answeredQuestions } = await supabase
                    .from('user_progress')
                    .select('question_id')
                    .eq('user_id', user.id);

                const answeredIds = new Set(answeredQuestions?.map((p: any) => p.question_id) || []);

                let query = supabase.from('questions').select('*');

                if (config.selectedIds.length > 0 && !config.selectedIds.includes('Overall')) {
                    const ids = config.selectedIds.join(',');
                    query = query.or(`subject_id.in.(${ids}),topic_id.in.(${ids}),subtopic_id.in.(${ids})`);
                }

                const { data: allQuestions, error: fetchError } = await query;

                if (fetchError) throw fetchError;

                const unansweredQuestions = allQuestions?.filter((q: any) => !answeredIds.has(q.id)) || [];

                if (unansweredQuestions.length === 0) {
                    throw new Error('No questions available for the selected filters. Try different topics or reset your progress.');
                }

                // Group by passage
                const groups: Record<string, Question[]> = {};
                const standalone: Question[] = [];

                unansweredQuestions.forEach(q => {
                    if (q.passage_id) {
                        if (!groups[q.passage_id]) groups[q.passage_id] = [];
                        groups[q.passage_id].push(q);
                    } else {
                        standalone.push(q);
                    }
                });

                // Helper to shuffle array
                const shuffle = <T>(array: T[]) => array.sort(() => Math.random() - 0.5);

                // Shuffle groups and standalone
                const shuffledGroups = shuffle(Object.values(groups));
                const shuffledStandalone = shuffle(standalone);

                // Select untill count reached
                const selection: Question[] = [];
                let count = 0;

                // We can mix groups and standalone. Let's create a pool of items (Group | Question)
                const pool = [...shuffledGroups, ...shuffledStandalone];
                const shuffledPool = shuffle(pool);

                for (const item of shuffledPool) {
                    if (count >= config.questionCount) break;

                    if (Array.isArray(item)) {
                        // It's a group
                        // Sort questions within group (e.g. by text length or alpha, assuming serial nature)
                        // Real serial order requires 'order' field. We'll use text or ID as proxy.
                        item.sort((a, b) => a.question_text.localeCompare(b.question_text));
                        selection.push(...item);
                        count += item.length;
                    } else {
                        selection.push(item);
                        count++;
                    }
                }
                selectedQuestions = selection;
            }

            // Fetch passages for selected questions
            const passageIds = Array.from(new Set(selectedQuestions.map(q => q.passage_id).filter(id => !!id))) as string[];
            if (passageIds.length > 0) {
                const { data: passagesData, error: passagesError } = await supabase
                    .from('reading_passages')
                    .select('*')
                    .in('id', passageIds);

                if (passagesError) throw passagesError;

                (passagesData || []).forEach(p => {
                    passagesMap[p.id] = p;
                });
            }

            if (selectedQuestions.length === 0) {
                throw new Error('No questions available for the selected filters.');
            }

            // Create session in database
            const { data: session, error: sessionError } = await supabase
                .from('practice_sessions')
                .insert({
                    user_id: user.id,
                    mode: config.mode,
                    time_per_question: config.mode === 'timed' ? config.timePerQuestion : null,
                    subjects: config.selectedIds,
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
                passages: passagesMap // Add passages to state
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
        session: state.session,
        questions: state.questions,
        currentQuestion: state.questions[state.currentIndex],
        currentIndex: state.currentIndex,
        answers: state.answers,
        timeRemaining: state.timeRemaining,
        isComplete: state.isComplete,
        feedbackMode: state.feedbackMode,
        totalVpEarned: state.totalVpEarned,
        passages: state.passages, // Add passages to return object
        startSession,
        submitAnswer,
        nextQuestion,
        completeSession,
        resetSession,
        setTimeRemaining: (time: number | null) => setState(prev => ({ ...prev, timeRemaining: time })),
    };
}
