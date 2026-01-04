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
    Flag
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
    timePerQuestion
}: PracticeSessionProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [startTime] = useState(Date.now());

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
        if (mode === 'timed') {
            setTimeRemaining(timePerQuestion);
        }
    }, [question.id, mode, timePerQuestion, setTimeRemaining]);

    const handleSelectAnswer = (answer: string) => {
        if (hasAnswered) return;
        setSelectedAnswer(answer);
    };

    const handleSubmitAnswer = useCallback(() => {
        if (!selectedAnswer || hasAnswered) return;

        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        onAnswer(selectedAnswer, timeTaken);
        setHasAnswered(true);
    }, [selectedAnswer, hasAnswered, startTime, onAnswer]);

    const handleNext = () => {
        if (questionNumber >= totalQuestions) {
            onComplete();
        } else {
            onNext();
        }
    };

    const options = question.options || [];
    const optionLabels = ['A', 'B', 'C', 'D'];

    const progress = (questionNumber / totalQuestions) * 100;

    const getTimerColor = () => {
        if (timeRemaining === null) return '';
        if (timeRemaining <= 10) return 'text-red-500';
        if (timeRemaining <= 30) return 'text-yellow-500';
        return 'text-green-500';
    };

    return (
        <div className="container mx-auto px-6 py-8 max-w-4xl">
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

            {/* Question Card */}
            <Card className="border-border/40 mb-6">
                <CardContent className="p-6">
                    <div className="text-lg leading-relaxed">
                        <MarkdownText text={question.question_text} />
                    </div>

                    {question.image_url && (
                        <div className="mt-4">
                            <img
                                src={question.image_url}
                                alt="Question"
                                className="max-w-full rounded-lg"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Options */}
            <div className="grid gap-3 mb-8">
                {options.map((option, index) => {
                    const label = optionLabels[index];
                    const isSelected = selectedAnswer === label;

                    return (
                        <button
                            key={index}
                            onClick={() => handleSelectAnswer(label)}
                            disabled={hasAnswered}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                                } ${hasAnswered ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                    }`}
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

            {/* Actions */}
            <div className="flex gap-4">
                {!hasAnswered ? (
                    <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer}
                        className="flex-1 h-12 gradient-primary"
                    >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Submit Answer
                    </Button>
                ) : (
                    <Button
                        onClick={handleNext}
                        className="flex-1 h-12 gradient-primary"
                    >
                        {questionNumber >= totalQuestions ? (
                            <>
                                <Flag className="w-5 h-5 mr-2" />
                                Finish Practice
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-5 h-5 mr-2" />
                                Next Question
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
