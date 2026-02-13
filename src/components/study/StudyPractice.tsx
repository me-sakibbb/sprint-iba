"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Play, CheckCircle, XCircle, ArrowRight, Loader2,
    Brain, Target, RotateCcw, Trophy, Sparkles, Clock, AlertCircle,
    CheckCircle2, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { checkIsCorrect } from "@/utils/answerValidation";
import { MarkdownText } from "@/components/MarkdownText";
import PracticeResults from "@/components/practice/PracticeResults";
import PracticeSession from "@/components/practice/PracticeSession";
import type { Tables } from "@/integrations/supabase/types";
import {
    awardPracticeAnswerPoints,
    awardSessionCompletionBonus
} from "@/services/practicePointsService";
import { showPointToast } from "@/components/AchievementToast";

interface StudyPracticeProps {
    topicName: string | null;
    subtopicName: string | null;
    topicId: string;
    onPracticeComplete?: (attempted: number, correct: number) => void;
}

type Question = Tables<'questions'>;

type PracticeStep = 'loading' | 'selector' | 'practicing' | 'results';

export default function StudyPractice({
    topicName,
    subtopicName,
    topicId,
    onPracticeComplete,
}: StudyPracticeProps) {
    const { user } = useAuth();

    // Core state
    const [step, setStep] = useState<PracticeStep>('loading');
    const [allEligibleQuestions, setAllEligibleQuestions] = useState<Question[]>([]);
    const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [passages, setPassages] = useState<Record<string, any>>({});

    // Active session state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [hasAnswered, setHasAnswered] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());
    const [sessionMode, setSessionMode] = useState<'mixed' | 'mistakes'>('mixed');

    // VP earned local state
    const [vpEarned, setVpEarned] = useState(0);

    // Initial Fetch: All questions for this topic and current user progress
    const initData = useCallback(async () => {
        if (!user) return;
        setStep('loading');

        try {
            // 1. Fetch questions
            let qQuery = supabase
                .from('questions')
                .select('*')
                .eq('is_verified', true);

            if (subtopicName) {
                qQuery = qQuery.eq('subtopic', subtopicName);
            } else if (topicName) {
                qQuery = qQuery.eq('topic', topicName);
            }

            const { data: questions, error: qError } = await qQuery;
            if (qError) throw qError;

            // 2. Fetch user progress
            const { data: progress, error: pError } = await supabase
                .from('user_progress')
                .select('question_id, is_correct')
                .eq('user_id', user.id);

            if (pError) throw pError;

            const progressMap = new Map(progress?.map(p => [p.question_id, p.is_correct]));

            // Filter questions to those in this topic
            const eligible = (questions || []) as Question[];
            setAllEligibleQuestions(eligible);

            // Count mistakes for the selector view
            const mistakes = eligible.filter(q => progressMap.get(q.id) === false);
            setMistakeCount(mistakes.length);

            setStep('selector');
        } catch (error) {
            console.error('Error in practice init:', error);
        }
    }, [user, topicName, subtopicName]);

    useEffect(() => {
        initData();
    }, [initData]);

    const startSession = async (mode: 'mixed' | 'mistakes') => {
        if (!user) return;
        setSessionMode(mode);

        try {
            // 1. Prioritize questions
            const { data: progress } = await supabase
                .from('user_progress')
                .select('question_id, is_correct')
                .eq('user_id', user.id);

            const progressMap = new Map(progress?.map(p => [p.question_id, p.is_correct]));

            const mistakes = allEligibleQuestions.filter(q => progressMap.get(q.id) === false);
            const newQuestions = allEligibleQuestions.filter(q => !progressMap.has(q.id));
            const mastered = allEligibleQuestions.filter(q => progressMap.get(q.id) === true);

            // Grouping Helper
            const createGroups = (qs: Question[]) => {
                const groups: Record<string, Question[]> = {};
                const standalone: Question[] = [];
                qs.forEach(q => {
                    if (q.passage_id) {
                        if (!groups[q.passage_id]) groups[q.passage_id] = [];
                        groups[q.passage_id].push(q);
                    } else {
                        standalone.push(q);
                    }
                });

                // Sort groups serially
                Object.values(groups).forEach(g => g.sort((a, b) => a.question_text.localeCompare(b.question_text)));

                // Return mixed and shuffled pool of (Group | Question)
                const pool = [...Object.values(groups), ...standalone];
                return pool.sort(() => Math.random() - 0.5);
            };

            let selected: Question[] = [];
            const targetCount = 10;

            if (mode === 'mistakes') {
                const mistakesPool = createGroups(mistakes);
                let count = 0;
                for (const item of mistakesPool) {
                    if (Array.isArray(item)) {
                        selected.push(...item);
                        count += item.length;
                    } else {
                        selected.push(item);
                        count++;
                    }
                }
                // No limit on mistakes mode? Previous code didn't slice? 
                // Ah, previous code: `selected = [...mistakes].sort(...)`. No slice? 
                // Wait, logic says `PriorityPool.slice(0, 10)`. But mistakes mode was `[...mistakes]`.
                // If mistakes list is huge, that's bad. But `StudyPractice` usually has limited scope (Topic).
                // Let's keep all mistakes for now, or slice if huge.
            } else {
                // Mixed Mode: Priority = Mistakes -> New -> Mastered
                const mistakesPool = createGroups(mistakes);
                const newPool = createGroups(newQuestions);
                const masteredPool = createGroups(mastered);

                const fullPool = [...mistakesPool, ...newPool, ...masteredPool];
                // We actually want to prioritize mistakes, then new, then mastered.
                // Previous logic: `PriorityPool = [...mistakes, ...newQuestions]`.
                // Let's keep that priority.

                let count = 0;

                // Add from mistakes
                for (const item of mistakesPool) {
                    if (count >= targetCount) break;
                    if (Array.isArray(item)) { selected.push(...item); count += item.length; }
                    else { selected.push(item); count++; }
                }

                // Add from new
                if (count < targetCount) {
                    for (const item of newPool) {
                        if (count >= targetCount) break;
                        if (Array.isArray(item)) { selected.push(...item); count += item.length; }
                        else { selected.push(item); count++; }
                    }
                }

                // Add from mastered
                if (count < targetCount) {
                    for (const item of masteredPool) {
                        if (count >= targetCount) break;
                        if (Array.isArray(item)) { selected.push(...item); count += item.length; }
                        else { selected.push(item); count++; }
                    }
                }
            }

            if (selected.length === 0) return;

            // Fetch passages
            const passageIds = Array.from(new Set(selected.map(q => q.passage_id).filter(id => !!id))) as string[];
            const passagesMap: Record<string, any> = {};

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

            setPassages(passagesMap);

            // 2. Create practice session record
            const { data: session, error: sError } = await supabase
                .from('practice_sessions')
                .insert({
                    user_id: user.id,
                    mode: 'untimed',
                    subjects: topicName ? [topicName] : [],
                    total_questions: selected.length,
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (sError) throw sError;

            setSessionId(session.id);
            setSessionQuestions(selected);
            setAnswers({});
            setCurrentIndex(0);
            setHasAnswered(false);
            setStartTime(Date.now());
            setVpEarned(0);
            setStep('practicing');
        } catch (e) {
            console.error('Error starting session:', e);
        }
    };

    const { recordAnswerAndMistake } = useStudyProgress();

    const handleAnswer = async (answer: string) => {
        if (hasAnswered || !user) return;

        const question = sessionQuestions[currentIndex];
        const isCorrect = checkIsCorrect(question.correct_answer, answer, question.options);

        setHasAnswered(true);
        setAnswers(prev => ({ ...prev, [question.id]: answer }));

        try {
            // Record progress and log mistake if incorrect
            await recordAnswerAndMistake({
                userId: user.id,
                questionId: question.id,
                isCorrect,
                userAnswer: answer,
                correctAnswer: question.correct_answer || 'Unknown',
                context: 'practice',
                topic: question.topic,
                subtopic: question.subtopic,
                difficulty: question.difficulty,
            });

            // 3. Award points via service
            const result = await awardPracticeAnswerPoints(
                user.id,
                question.id,
                answer,
                question.correct_answer || '',
                question.options,
                (question.difficulty?.toLowerCase() as any) || 'medium'
            );

            // 4. Show Achievement Toast
            showPointToast({
                amount: result.vpAwarded,
                reason: isCorrect ? 'Correct Answer' : 'Incorrect Answer',
                type: isCorrect ? 'points' : 'penalty',
                description: isCorrect ? `You earned points for ${question.difficulty || 'medium'} difficulty.` : `Better luck next time!`
            });

            // Update local VP display
            setVpEarned(prev => prev + result.vpAwarded);
        } catch (e) {
            console.error('Error awarding points:', e);
        }
    };

    const handleNext = async () => {
        if (currentIndex + 1 >= sessionQuestions.length) {
            // Session Complete
            if (user && sessionId) {
                const correctCount = Object.entries(answers).filter(([qid, ans]) => {
                    const q = sessionQuestions.find(sq => sq.id === qid);
                    return q && checkIsCorrect(q.correct_answer, ans, q.options);
                }).length;

                try {
                    // 1. Update session record
                    await supabase
                        .from('practice_sessions')
                        .update({
                            completed_at: new Date().toISOString(),
                            correct_count: correctCount,
                        })
                        .eq('id', sessionId);

                    // 2. Award completion bonuses
                    const bonusResult = await awardSessionCompletionBonus(
                        user.id,
                        sessionId,
                        correctCount,
                        sessionQuestions.length
                    );

                    // 3. Show dynamic toasts for bonuses
                    if (bonusResult.sessionBonus > 0) {
                        showPointToast({
                            amount: bonusResult.sessionBonus,
                            reason: 'Session Complete',
                            type: 'bonus'
                        });
                    }
                    if (bonusResult.perfectBonus > 0) {
                        showPointToast({
                            amount: bonusResult.perfectBonus,
                            reason: 'Perfect Score!',
                            type: 'perfect',
                            description: '100% Accuracy achieved!'
                        });
                    } else if (bonusResult.highScoreBonus > 0) {
                        showPointToast({
                            amount: bonusResult.highScoreBonus,
                            reason: 'High Score!',
                            type: 'bonus',
                            description: 'Great performance in this session.'
                        });
                    }
                    if (bonusResult.streakBonus > 0) {
                        showPointToast({
                            amount: bonusResult.streakBonus,
                            reason: 'Streak Bonus',
                            type: 'streak',
                            description: `${bonusResult.streakCount} day study streak!`
                        });
                    }

                    // Add bonuses to local total for the results screen
                    setVpEarned(prev => prev + bonusResult.totalVP);
                } catch (e) {
                    console.error('Error finalizing session:', e);
                }
            }

            setStep('results');

            const attempted = sessionQuestions.length;
            const finalCorrect = Object.entries(answers).filter(([qid, ans]) => {
                const q = sessionQuestions.find(sq => sq.id === qid);
                return q && checkIsCorrect(q.correct_answer, ans, q.options);
            }).length;

            onPracticeComplete?.(attempted, finalCorrect);
        } else {
            setCurrentIndex(prev => prev + 1);
            setHasAnswered(false);
            setStartTime(Date.now());
        }
    };

    // UI Renders
    if (step === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse font-medium">Preparing questions...</p>
            </div>
        );
    }

    if (step === 'selector') {
        const canPracticeMistakes = mistakeCount > 0;

        return (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
                <div className="text-center space-y-2 mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-2">
                        <Brain className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold italic tracking-tight">Ready to verify your knowledge?</h3>
                    <p className="text-muted-foreground">
                        Select a practice mode to begin. Questions are prioritized to help you learn faster.
                    </p>
                </div>

                <div className="grid gap-4">
                    {/* Standard Mode */}
                    <Card className="group border-border/40 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md overflow-hidden relative" onClick={() => startSession('mixed')}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Target className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-lg">Mixed Practice</h4>
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0">Smart priority</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Focuses on <span className="text-foreground font-medium">New</span> questions and your recent <span className="text-red-500 font-medium">Mistakes</span>.
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground translate-x-0 group-hover:translate-x-1 transition-all" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mistakes Only Mode */}
                    <Card
                        className={cn(
                            "group border-border/40 transition-all shadow-sm overflow-hidden relative",
                            canPracticeMistakes
                                ? "hover:border-red-500/50 cursor-pointer hover:shadow-md"
                                : "opacity-60 grayscale cursor-not-allowed"
                        )}
                        onClick={() => canPracticeMistakes && startSession('mistakes')}
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <RotateCcw className="w-12 h-12 text-red-500" />
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                    canPracticeMistakes ? "bg-red-500/10" : "bg-muted"
                                )}>
                                    <AlertCircle className={cn("w-6 h-6", canPracticeMistakes ? "text-red-600" : "text-muted-foreground")} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-lg">Mistake Focus</h4>
                                        <Badge variant="secondary" className="bg-red-500/10 text-red-600 hover:bg-red-500/10 text-[10px] uppercase font-bold tracking-wider px-2 py-0">
                                            {mistakeCount} to clear
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Practice <span className="text-red-600 font-medium">only</span> questions you previously got wrong.
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground translate-x-0 group-hover:translate-x-1 transition-all" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="pt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground border-t">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Adaptive Learning</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span>Instant Feedback</span>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'results') {
        const mockSession = {
            id: 'study-session',
            mode: 'untimed',
            user_id: user?.id || '',
            correct_count: Object.entries(answers).filter(([qid, ans]) => {
                const q = sessionQuestions.find(sq => sq.id === qid);
                return q && checkIsCorrect(q.correct_answer, ans, q.options);
            }).length,
            total_questions: sessionQuestions.length,
            started_at: new Date().toISOString()
        } as any;

        return (
            <PracticeResults
                session={mockSession}
                questions={sessionQuestions as any}
                answers={answers}
                onRetry={initData}
                vpEarned={vpEarned}
                passages={passages}
            />
        );
    }

    // PRACTICING VIEW
    const currentQuestion = sessionQuestions[currentIndex];

    // Adapter for PracticeSession onAnswer
    const onSessionAnswer = (answer: string, timeTaken?: number) => {
        handleAnswer(answer);
    };

    return (
        <div className="py-2">
            <PracticeSession
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={sessionQuestions.length}
                mode="untimed"
                timeRemaining={null}
                onAnswer={onSessionAnswer}
                onNext={handleNext}
                onComplete={handleNext} // handleNext handles completion if index >= length
                onTimeUp={() => { }}
                setTimeRemaining={() => { }}
                timePerQuestion={0}
                feedbackMode="immediate"
                passages={passages}
            />
        </div>
    );
}
