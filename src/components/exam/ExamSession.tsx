"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Clock,
    ArrowLeft,
    ArrowRight,
    Send,
    CheckCircle,
    Flag,
    AlertTriangle
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MarkdownText } from "@/components/MarkdownText";

type Exam = Tables<'exams'>;
type Question = Tables<'questions'>;

interface ExamSessionProps {
    exam: Exam;
    questions: Question[];
    currentQuestion: Question;
    currentIndex: number;
    answers: Record<string, string>;
    timeRemaining: number;
    passages?: Record<string, any>;
    onAnswer: (questionId: string, answer: string) => void;
    onNavigate: (index: number) => void;
    onSubmit: () => void;
    setTimeRemaining: (time: number) => void;
}

export default function ExamSession({
    exam,
    questions,
    currentQuestion,
    currentIndex,
    answers,
    timeRemaining,
    passages = {},
    onAnswer,
    onNavigate,
    onSubmit,
    setTimeRemaining
}: ExamSessionProps) {
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);

    // Timer
    useEffect(() => {
        if (timeRemaining <= 0) {
            onSubmit();
            return;
        }

        const timer = setInterval(() => {
            setTimeRemaining(timeRemaining - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, onSubmit, setTimeRemaining]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeRemaining <= 60) return 'text-red-500 bg-red-500/10';
        if (timeRemaining <= 300) return 'text-yellow-500 bg-yellow-500/10';
        return 'text-green-500 bg-green-500/10';
    };

    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    const options = currentQuestion?.options || [];
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    const selectedAnswer = answers[currentQuestion?.id];

    const handleSelectAnswer = (label: string) => {
        if (currentQuestion) {
            onAnswer(currentQuestion.id, label);
        }
    };

    const unansweredCount = questions.length - answeredCount;

    const currentPassage = currentQuestion?.passage_id ? passages?.[currentQuestion.passage_id] : null;

    return (
        <div className="min-h-screen bg-background">
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur border-b z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="font-bold text-lg">{exam.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                Question {currentIndex + 1} of {questions.length}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${getTimerColor()}`}>
                                <Clock className="w-5 h-5" />
                                {formatTime(timeRemaining)}
                            </div>

                            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                                <AlertDialogTrigger asChild>
                                    <Button className="gradient-primary">
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {unansweredCount > 0 ? (
                                                <div className="flex items-center gap-2 text-yellow-600 mb-3">
                                                    <AlertTriangle className="w-5 h-5" />
                                                    You have {unansweredCount} unanswered question(s).
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-600 mb-3">
                                                    <CheckCircle className="w-5 h-5" />
                                                    All questions answered!
                                                </div>
                                            )}
                                            Are you sure you want to submit? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Continue Exam</AlertDialogCancel>
                                        <AlertDialogAction onClick={onSubmit}>
                                            Submit
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    <Progress value={progress} className="h-1 mt-3" />
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 pt-32 pb-8 flex gap-6">
                {/* Question Navigation Sidebar */}
                <div className="hidden lg:block w-64 shrink-0">
                    <Card className="border-border/40 sticky top-32">
                        <CardContent className="p-4">
                            <h3 className="font-semibold mb-3 text-sm">Questions</h3>
                            <ScrollArea className="h-[400px]">
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((q, idx) => {
                                        const isAnswered = !!answers[q.id];
                                        const isCurrent = idx === currentIndex;

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => onNavigate(idx)}
                                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${isCurrent
                                                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                                                    : isAnswered
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-muted hover:bg-muted/80'
                                                    }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </ScrollArea>

                            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-500" />
                                    <span>Answered ({answeredCount})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-muted" />
                                    <span>Unanswered ({unansweredCount})</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Question Content */}
                <div className={`flex-1 ${currentPassage ? 'w-full grid grid-cols-1 xl:grid-cols-2 gap-6' : 'max-w-3xl'}`}>
                    {/* Passage Column */}
                    {currentPassage && (
                        <Card className="border-border/40 h-fit max-h-[calc(100vh-12rem)] overflow-y-auto sticky top-32">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Reading Passage</Badge>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <MarkdownText text={currentPassage.content} />
                                </div>
                                {currentPassage.image_url && (
                                    <div className="mt-4">
                                        <img
                                            src={currentPassage.image_url}
                                            alt="Passage"
                                            className="max-w-full rounded-lg"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-6">
                        <Card className="border-border/40">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Badge variant="outline">Q{currentIndex + 1}</Badge>
                                    {currentQuestion?.topic && (
                                        <Badge variant="secondary">{currentQuestion.topic}</Badge>
                                    )}
                                    {currentQuestion?.difficulty && (
                                        <Badge
                                            variant="outline"
                                            className={`${currentQuestion.difficulty === 'hard'
                                                ? 'border-red-500 text-red-500'
                                                : currentQuestion.difficulty === 'medium'
                                                    ? 'border-yellow-500 text-yellow-500'
                                                    : 'border-green-500 text-green-500'
                                                }`}
                                        >
                                            {currentQuestion.difficulty}
                                        </Badge>
                                    )}
                                </div>

                                <div className="text-lg leading-relaxed">
                                    <MarkdownText text={currentQuestion?.question_text || ''} />
                                </div>

                                {currentQuestion?.image_url && (
                                    <div className="mt-4">
                                        <img
                                            src={currentQuestion.image_url}
                                            alt="Question"
                                            className="max-w-full rounded-lg"
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

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectAnswer(label)}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                            }`}
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
                                        {isSelected && (
                                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between pt-4">
                            <Button
                                variant="outline"
                                onClick={() => onNavigate(currentIndex - 1)}
                                disabled={currentIndex === 0}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Previous
                            </Button>

                            <Button
                                onClick={() => onNavigate(currentIndex + 1)}
                                disabled={currentIndex === questions.length - 1}
                            >
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
