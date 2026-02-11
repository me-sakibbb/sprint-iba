import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Exam = Tables<'exams'>;
type ExamAttempt = Tables<'exam_attempts'>;
type Question = Tables<'questions'>;

interface ExamWithStatus extends Exam {
    status: 'upcoming' | 'active' | 'ended' | 'available';
    userAttempt?: ExamAttempt;
    canTake: boolean;
}

interface ExamState {
    attempt: ExamAttempt | null;
    exam: Exam | null;
    questions: Question[];
    passages: Record<string, any>;
    currentIndex: number;
    answers: Record<string, string>;
    timeRemaining: number;
    isSubmitted: boolean;
}

export function useExam() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exams, setExams] = useState<ExamWithStatus[]>([]);
    const [state, setState] = useState<ExamState>({
        attempt: null,
        exam: null,
        questions: [],
        passages: {},
        currentIndex: 0,
        answers: {},
        timeRemaining: 0,
        isSubmitted: false,
    });

    // Fetch available exams
    const fetchExams = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Get all published exams
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (examError) throw examError;

            // Get user's attempts
            const { data: attemptData } = await supabase
                .from('exam_attempts')
                .select('*')
                .eq('user_id', user.id);

            const attemptMap = new Map(attemptData?.map((a: any) => [a.exam_id, a]) || []);

            const now = new Date();
            const examsWithStatus: ExamWithStatus[] = (examData || []).map((exam: any) => {
                const userAttempt = attemptMap.get(exam.id) as ExamAttempt | undefined;
                let status: ExamWithStatus['status'] = 'available';
                let canTake = true;

                if (exam.type === 'live') {
                    const startTime = exam.start_time ? new Date(exam.start_time) : null;
                    const endTime = exam.end_time ? new Date(exam.end_time) : null;

                    if (startTime && now < startTime) {
                        status = 'upcoming';
                        canTake = false;
                    } else if (endTime && now > endTime) {
                        status = 'ended';
                        canTake = false;
                    } else {
                        status = 'active';
                    }
                }

                // Check retake policy
                if (userAttempt?.is_submitted && !exam.allow_retake) {
                    canTake = false;
                }

                return {
                    ...exam,
                    status,
                    userAttempt,
                    canTake,
                };
            });

            setExams(examsWithStatus);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    // Start or resume an exam
    const startExam = useCallback(async (examId: string) => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // Get exam details
            const { data: exam, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single();

            if (examError) throw examError;

            // Get questions
            const { data: questions, error: questionsError } = await supabase
                .from('questions')
                .select('*')
                .in('id', exam.question_ids || []);

            if (questionsError) throw questionsError;

            // Fetch associated passages
            const passageIds = Array.from(new Set(questions?.map((q) => q.passage_id).filter((id): id is string => !!id)));
            let passagesMap: Record<string, any> = {};

            if (passageIds.length > 0) {
                const { data: passages, error: passagesError } = await supabase
                    .from('reading_passages')
                    .select('*')
                    .in('id', passageIds);

                if (passagesError) throw passagesError;

                passages?.forEach((p: any) => {
                    passagesMap[p.id] = p;
                });
            }

            // Order questions by exam.question_ids order
            const orderedQuestions = (exam.question_ids || [])
                .map((id: string) => questions?.find((q: any) => q.id === id))
                .filter(Boolean) as Question[];

            // Check for existing attempt
            let attempt: ExamAttempt;
            const { data: existingAttempt } = await supabase
                .from('exam_attempts')
                .select('*')
                .eq('exam_id', examId)
                .eq('user_id', user.id)
                .single();

            if (existingAttempt && !existingAttempt.is_submitted) {
                // Resume existing attempt
                attempt = existingAttempt as ExamAttempt;
            } else if (existingAttempt && exam.allow_retake) {
                // Delete old attempt and create new one
                await supabase
                    .from('exam_attempts')
                    .delete()
                    .eq('id', existingAttempt.id);

                const { data: newAttempt, error: attemptError } = await supabase
                    .from('exam_attempts')
                    .insert({
                        exam_id: examId,
                        user_id: user.id,
                        answers: {},
                        score: 0,
                        total_questions: orderedQuestions.length,
                    } as any)
                    .select()
                    .single();

                if (attemptError) throw attemptError;
                attempt = newAttempt as ExamAttempt;
            } else if (!existingAttempt) {
                // Create new attempt
                const { data: newAttempt, error: attemptError } = await supabase
                    .from('exam_attempts')
                    .insert({
                        exam_id: examId,
                        user_id: user.id,
                        answers: {},
                        score: 0,
                        total_questions: orderedQuestions.length,
                    } as any)
                    .select()
                    .single();

                if (attemptError) throw attemptError;
                attempt = newAttempt as ExamAttempt;
            } else {
                throw new Error('You have already completed this exam and retakes are not allowed.');
            }

            // Calculate remaining time
            const startedAt = new Date(attempt.started_at);
            const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
            const totalSeconds = exam.duration_minutes * 60;
            const remaining = Math.max(0, totalSeconds - elapsedSeconds);

            setState({
                attempt,
                exam: exam as Exam,
                questions: orderedQuestions,
                passages: passagesMap,
                currentIndex: 0,
                answers: (attempt.answers as Record<string, string>) || {},
                timeRemaining: remaining,
                isSubmitted: false,
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Save answer (auto-save)
    const saveAnswer = useCallback(async (questionId: string, answer: string) => {
        if (!state.attempt) return;

        const newAnswers = { ...state.answers, [questionId]: answer };
        setState(prev => ({ ...prev, answers: newAnswers }));

        // Auto-save to database
        await supabase
            .from('exam_attempts')
            .update({ answers: newAnswers } as any)
            .eq('id', state.attempt.id);

    }, [state.attempt, state.answers]);

    // Navigate to question
    const goToQuestion = useCallback((index: number) => {
        setState(prev => ({ ...prev, currentIndex: index }));
    }, []);

    // Submit exam
    const submitExam = useCallback(async () => {
        if (!state.attempt || !state.exam) return;

        setLoading(true);
        try {
            // Securely submit attempt via RPC
            const { data, error } = await supabase.rpc('submit_exam_attempt', {
                p_attempt_id: state.attempt.id,
                p_answers: state.answers
            });

            if (error) throw error;

            const result = data as any; // { score, total_questions, points_awarded, ... }

            // If points were awarded, dispatch event for UI updates
            if (result.points_awarded > 0) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('points-updated'));
                }
            }

            setState(prev => ({
                ...prev,
                isSubmitted: true,
                attempt: prev.attempt ? {
                    ...prev.attempt,
                    score: result.score,
                    is_submitted: true,
                    submitted_at: new Date().toISOString(),
                } : null,
            }));

            // Refresh exams list
            fetchExams();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [state, fetchExams]);

    // Get leaderboard for an exam
    const getLeaderboard = useCallback(async (examId: string) => {
        const { data, error } = await supabase
            .from('exam_attempts')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('exam_id', examId)
            .eq('is_submitted', true)
            .order('score', { ascending: false })
            .order('submitted_at', { ascending: true });

        if (error) throw error;
        return data;
    }, []);

    // Reset exam state
    const resetExam = useCallback(() => {
        setState({
            attempt: null,
            exam: null,
            questions: [],
            passages: {},
            currentIndex: 0,
            answers: {},
            timeRemaining: 0,
            isSubmitted: false,
        });
    }, []);

    return {
        loading,
        error,
        exams,
        exam: state.exam,
        attempt: state.attempt,
        questions: state.questions,
        passages: state.passages,
        currentQuestion: state.questions[state.currentIndex],
        currentIndex: state.currentIndex,
        answers: state.answers,
        timeRemaining: state.timeRemaining,
        isSubmitted: state.isSubmitted,
        fetchExams,
        startExam,
        saveAnswer,
        goToQuestion,
        submitExam,
        getLeaderboard,
        resetExam,
        setTimeRemaining: (time: number) => setState(prev => ({ ...prev, timeRemaining: time })),
    };
}
