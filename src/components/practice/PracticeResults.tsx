"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Trophy,
    CheckCircle,
    XCircle,
    RotateCcw,
    ChevronDown,
    Brain,
    Target,
    Clock,
    Sparkles
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MarkdownText } from "@/components/MarkdownText";

type Question = Tables<'questions'>;
type PracticeSession = Tables<'practice_sessions'>;

interface PracticeResultsProps {
    session: PracticeSession;
    questions: Question[];
    answers: Record<string, string>;
    onRetry: () => void;
}

export default function PracticeResults({
    session,
    questions,
    answers,
    onRetry
}: PracticeResultsProps) {
    const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

    const correctCount = questions.filter(q => q.correct_answer === answers[q.id]).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    const toggleQuestion = (id: string) => {
        setExpandedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const getScoreColor = () => {
        if (percentage >= 80) return 'text-green-500';
        if (percentage >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreMessage = () => {
        if (percentage >= 90) return "Outstanding! 🎉";
        if (percentage >= 80) return "Great job! 💪";
        if (percentage >= 70) return "Good work! 👍";
        if (percentage >= 60) return "Keep practicing! 📚";
        return "Don't give up! 💪";
    };

    return (
        <div className="container mx-auto px-6 py-8 max-w-4xl">
            {/* Score Summary */}
            <Card className="border-border/40 mb-8 overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Trophy className={`w-12 h-12 ${getScoreColor()}`} />
                        </div>
                        <h1 className="text-4xl font-bold mb-2">
                            <span className={getScoreColor()}>{correctCount}</span>
                            <span className="text-muted-foreground"> / {questions.length}</span>
                        </h1>
                        <p className="text-xl text-muted-foreground mb-4">{getScoreMessage()}</p>

                        <div className="max-w-md mx-auto">
                            <Progress value={percentage} className="h-3" />
                            <p className="text-sm text-muted-foreground mt-2">{percentage}% correct</p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-xl bg-muted/50">
                            <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                            <div className="text-2xl font-bold">{questions.length}</div>
                            <div className="text-sm text-muted-foreground">Questions</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-green-500/10">
                            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                            <div className="text-2xl font-bold text-green-500">{correctCount}</div>
                            <div className="text-sm text-muted-foreground">Correct</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-red-500/10">
                            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                            <div className="text-2xl font-bold text-red-500">{questions.length - correctCount}</div>
                            <div className="text-sm text-muted-foreground">Incorrect</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Question Review */}
            <Card className="border-border/40 mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        Question Review
                    </CardTitle>
                    <CardDescription>Review your answers and learn from mistakes</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                            {questions.map((question, index) => {
                                const userAnswer = answers[question.id];
                                const isCorrect = question.correct_answer === userAnswer;
                                const isExpanded = expandedQuestions.has(question.id);

                                return (
                                    <Collapsible
                                        key={question.id}
                                        open={isExpanded}
                                        onOpenChange={() => toggleQuestion(question.id)}
                                    >
                                        <CollapsibleTrigger asChild>
                                            <button
                                                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${isCorrect
                                                    ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                                                    : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                                                    }`}
                                            >
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-red-500'
                                                        }`}
                                                >
                                                    {isCorrect ? (
                                                        <CheckCircle className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold">Question {index + 1}</span>
                                                        {question.topic && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {question.topic}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {question.question_text.substring(0, 100)}...
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''
                                                        }`}
                                                />
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="p-4 mt-2 rounded-xl bg-muted/30 space-y-4">
                                                {/* Question */}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2">Question</h4>
                                                    <div className="text-sm">
                                                        <MarkdownText text={question.question_text} />
                                                    </div>
                                                </div>

                                                {/* Options with answers */}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2">Options</h4>
                                                    <div className="space-y-2">
                                                        {(question.options || []).map((option, optIndex) => {
                                                            const label = ['A', 'B', 'C', 'D'][optIndex];
                                                            const isUserAnswer = userAnswer === label;
                                                            const isCorrectAnswer = question.correct_answer === label;

                                                            return (
                                                                <div
                                                                    key={optIndex}
                                                                    className={`flex items-start gap-3 p-3 rounded-lg text-sm ${isCorrectAnswer
                                                                        ? 'bg-green-500/20 border border-green-500/30'
                                                                        : isUserAnswer
                                                                            ? 'bg-red-500/20 border border-red-500/30'
                                                                            : 'bg-background'
                                                                        }`}
                                                                >
                                                                    <div
                                                                        className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-bold ${isCorrectAnswer
                                                                            ? 'bg-green-500 text-white'
                                                                            : isUserAnswer
                                                                                ? 'bg-red-500 text-white'
                                                                                : 'bg-muted'
                                                                            }`}
                                                                    >
                                                                        {label}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <MarkdownText text={option} />
                                                                    </div>
                                                                    {isCorrectAnswer && (
                                                                        <Badge className="bg-green-500 shrink-0">Correct</Badge>
                                                                    )}
                                                                    {isUserAnswer && !isCorrectAnswer && (
                                                                        <Badge variant="destructive" className="shrink-0">Your Answer</Badge>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Explanation */}
                                                {question.explanation && !isCorrect && (
                                                    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Sparkles className="w-4 h-4 text-primary" />
                                                            <h4 className="text-sm font-semibold">AI Explanation</h4>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            <MarkdownText text={question.explanation} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Actions */}
            <Button onClick={onRetry} className="w-full h-12 gradient-primary">
                <RotateCcw className="w-5 h-5 mr-2" />
                Practice Again
            </Button>
        </div>
    );
}
