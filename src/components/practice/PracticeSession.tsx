"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    ArrowRight,
    CheckCircle,
    Flag,
    Sparkles,
    AlertCircle,
    BookOpen
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MarkdownText } from "@/components/MarkdownText";

type Question = Tables<'questions'>;

interface PracticeSessionProps {
    question: Question;
    questionNumber: number;
    totalQuestions: number;
    mode: 'timed' | 'untimed';
    timeRemaining: number | null;
    onAnswer: (answer: string, timeTaken?: number) => void;
    onNext: () => void;
    onComplete: () => void;
    onTimeUp: () => void;
    setTimeRemaining: (time: number | null) => void;
    timePerQuestion: number;
    feedbackMode: 'immediate' | 'deferred';
    passages?: Record<string, any>;
}

export default function PracticeSession({
    question,
    questionNumber,
    totalQuestions,
    mode,
    timeRemaining,
    onAnswer,
    onNext,
    onComplete,
    onTimeUp,
    setTimeRemaining,
    timePerQuestion,
    feedbackMode,
    passages
}: PracticeSessionProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());

    // Passage content
    const currentPassage = question.passage_id && passages ? passages[question.passage_id] : null;

    // Helper to check answer correctness (matches Label, Option Text, or Index)
    const isCorrect = useCallback((answerLabel: string, optionText?: string, optionIndex?: number) => {
        if (!question.correct_answer) return false;
        const correct = String(question.correct_answer).trim().toLowerCase();

        // 1. Check Label (A, B, C...)
        if (String(answerLabel).trim().toLowerCase() === correct) return true;

        // 2. Check Option Text
        if (optionText && String(optionText).trim().toLowerCase() === correct) return true;

        // 3. Check Index (0, 1, 2... or 1, 2, 3...)
        if (typeof optionIndex === 'number') {
            // Check 0-based index
            if (String(optionIndex) === correct) return true;
        }

        return false;
    }, [question.correct_answer]);

    // Timer for timed mode
    useEffect(() => {
        if (mode !== 'timed' || timeRemaining === null || hasAnswered) return;

        if (timeRemaining <= 0) {
            onTimeUp();
            return;
        }

        const timer = setInterval(() => {
            setTimeRemaining(timeRemaining - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [mode, timeRemaining, hasAnswered, onTimeUp, setTimeRemaining]);

    // Reset state when question changes
    useEffect(() => {
        setSelectedAnswer(null);
        setHasAnswered(false);
        setStartTime(Date.now());
        if (mode === 'timed') {
            setTimeRemaining(timePerQuestion);
        }
        // Only reset when question ID changes
    }, [question.id]);

    const handleSelectAnswer = (answer: string) => {
        if (hasAnswered) return;
        setSelectedAnswer(answer);

        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        onAnswer(answer, timeTaken);
        setHasAnswered(true);

        // Auto-advance after a short delay only if NOT in immediate mode
        if (feedbackMode === 'deferred') {
            setTimeout(() => {
                if (questionNumber >= totalQuestions) {
                    onComplete();
                } else {
                    onNext();
                }
            }, 800);
        }
    };

    const handleNext = () => {
        if (questionNumber >= totalQuestions) {
            onComplete();
        } else {
            onNext();
        }
    };

    const options = question.options || [];
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    const progress = (questionNumber / totalQuestions) * 100;

    const getTimerColor = () => {
        if (timeRemaining === null) return '';
        if (timeRemaining <= 10) return 'text-red-500';
        if (timeRemaining <= 30) return 'text-yellow-500';
        return 'text-green-500';
    };

    return (
        <div className={`container mx-auto px-4 py-6 ${currentPassage ? 'max-w-[95vw]' : 'max-w-4xl'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-sm">
                        Question {questionNumber} of {totalQuestions}
                    </Badge>
                    {question.topic && (
                        <Badge variant="secondary" className="text-sm">
                            {question.topic}
                        </Badge>
                    )}
                    {question.difficulty && (
                        <Badge
                            variant="outline"
                            className={`text-sm ${question.difficulty === 'hard'
                                ? 'border-red-500 text-red-500'
                                : question.difficulty === 'medium'
                                    ? 'border-yellow-500 text-yellow-500'
                                    : 'border-green-500 text-green-500'
                                }`}
                        >
                            {question.difficulty}
                        </Badge>
                    )}
                </div>

                {mode === 'timed' && timeRemaining !== null && (
                    <div className={`flex items-center gap-2 text-lg font-bold ${getTimerColor()}`}>
                        <Clock className="w-5 h-5" />
                        {timeRemaining}s
                    </div>
                )}
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-2 mb-8" />

            <div className={`grid gap-6 ${currentPassage ? 'lg:grid-cols-2' : ''}`}>
                {/* Passage Column */}
                {currentPassage && (
                    <div className="h-fit lg:sticky lg:top-6">
                        <Card className="border-border/40 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
                            <div className="p-4 border-b bg-muted/20 font-medium flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                <span>Passage</span>
                            </div>
                            <div className="overflow-y-auto p-6 flex-1">
                                <div className="prose dark:prose-invert max-w-none text-base leading-relaxed">
                                    <MarkdownText text={currentPassage.content} />
                                </div>
                                {currentPassage.image_url && (
                                    <div className="mt-4">
                                        <img
                                            src={currentPassage.image_url}
                                            alt="Passage"
                                            className="max-h-[300px] w-auto object-contain rounded-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* Question Column */}
                <div className="space-y-6">
                    {/* Question Card */}
                    <Card className="border-border/40">
                        <CardContent className="p-6">
                            <div className="text-lg leading-relaxed">
                                <MarkdownText text={question.question_text} />
                            </div>

                            {question.image_url && (
                                <div className="mt-4">
                                    <img
                                        src={question.image_url}
                                        alt="Question"
                                        className="max-h-[300px] w-auto object-contain rounded-lg"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Options */}
                    <div className="grid gap-3">
                        {options.map((option, index) => {
                            const label = optionLabels[index];
                            const isSelected = selectedAnswer === label;

                            // Determine styling based on state and feedback mode
                            let borderClass = 'border-border hover:border-primary/50';
                            let bgClass = 'bg-background';
                            let labelBgClass = 'bg-muted';
                            let labelTextClass = '';

                            if (hasAnswered) {
                                if (feedbackMode === 'immediate') {
                                    if (isCorrect(label, option, index)) {
                                        borderClass = 'border-green-500 bg-green-500/10';
                                        labelBgClass = 'bg-green-500';
                                        labelTextClass = 'text-white';
                                    } else if (isSelected) {
                                        borderClass = 'border-red-500 bg-red-500/10';
                                        labelBgClass = 'bg-red-500';
                                        labelTextClass = 'text-white';
                                    }
                                } else {
                                    // Deferred mode - just show selection
                                    if (isSelected) {
                                        borderClass = 'border-primary bg-primary/5';
                                        labelBgClass = 'bg-primary';
                                        labelTextClass = 'text-primary-foreground';
                                    }
                                }
                            } else if (isSelected) {
                                borderClass = 'border-primary bg-primary/5';
                                labelBgClass = 'bg-primary';
                                labelTextClass = 'text-primary-foreground';
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSelectAnswer(label)}
                                    disabled={hasAnswered}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${borderClass} ${bgClass} ${hasAnswered ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${labelBgClass} ${labelTextClass}`}
                                    >
                                        {label}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <MarkdownText text={option} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions & Explanation */}
                    <div className="space-y-6">
                        {/* Explanation (Immediate Mode) */}
                        {hasAnswered && feedbackMode === 'immediate' && question.explanation && (
                            <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    <h4 className="font-semibold text-lg">AI Explanation</h4>
                                </div>
                                <div className="text-muted-foreground leading-relaxed">
                                    <MarkdownText text={question.explanation} />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            {!hasAnswered ? (
                                <Button
                                    variant="ghost"
                                    onClick={handleNext}
                                    className="flex-1 h-12 text-muted-foreground hover:text-primary"
                                >
                                    Skip Question
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                feedbackMode === 'immediate' ? (
                                    <Button
                                        onClick={handleNext}
                                        className="flex-1 h-12 gradient-primary animate-in fade-in zoom-in duration-300"
                                    >
                                        {questionNumber >= totalQuestions ? "Finish Practice" : "Next Question"}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : (
                                    <div className="flex-1 h-12 flex items-center justify-center text-primary font-medium animate-pulse">
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Recording answer...
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
