"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Play, CheckCircle, XCircle, ArrowRight, Loader2,
    Brain, Target, RotateCcw, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsCorrect } from "@/utils/answerValidation";
import { MarkdownText } from "@/components/MarkdownText";

interface StudyPracticeProps {
    topicName: string | null;
    subtopicName: string | null;
    topicId: string;
    onPracticeComplete?: (attempted: number, correct: number) => void;
}

interface Question {
    id: string;
    question_text: string;
    options: string[] | null;
    correct_answer: string | null;
    explanation: string | null;
    difficulty: string | null;
}

export default function StudyPractice({
    topicName,
    subtopicName,
    topicId,
    onPracticeComplete,
}: StudyPracticeProps) {
    const { user } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string>("");
    const [isAnswered, setIsAnswered] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [isPracticing, setIsPracticing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Fetch questions for this topic
    useEffect(() => {
        async function fetchQuestions() {
            setLoading(true);
            try {
                let query = supabase
                    .from('questions')
                    .select('id, question_text, options, correct_answer, explanation, difficulty')
                    .eq('is_verified', true);

                if (subtopicName) {
                    query = query.eq('subtopic', subtopicName);
                } else if (topicName) {
                    query = query.eq('topic', topicName);
                }

                const { data, error } = await query.limit(100);
                if (error) throw error;

                // Shuffle
                const shuffled = (data || []).sort(() => Math.random() - 0.5);
                setQuestions(shuffled);
            } catch (error) {
                console.error('Error fetching practice questions:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchQuestions();
    }, [topicName, subtopicName]);

    const currentQuestion = questions[currentIndex];

    const handleAnswer = () => {
        if (!currentQuestion || !selectedAnswer) return;

        setIsAnswered(true);
        const isCorrect = checkIsCorrect(
            currentQuestion.correct_answer,
            selectedAnswer,
            currentQuestion.options
        );

        setSessionTotal(prev => prev + 1);
        if (isCorrect) setSessionCorrect(prev => prev + 1);
    };

    const handleNext = () => {
        setSelectedAnswer("");
        setIsAnswered(false);

        if (currentIndex + 1 >= Math.min(questions.length, 10)) {
            setIsComplete(true);
            onPracticeComplete?.(sessionTotal, sessionCorrect);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleRestart = () => {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        setCurrentIndex(0);
        setSelectedAnswer("");
        setIsAnswered(false);
        setSessionCorrect(0);
        setSessionTotal(0);
        setIsComplete(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading practice questions...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Brain className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-1">No questions available</h3>
                <p className="text-sm text-muted-foreground/70">
                    Practice questions will appear here once they are added for this topic.
                </p>
            </div>
        );
    }

    // Not yet practicing — show overview
    if (!isPracticing) {
        return (
            <div className="space-y-6">
                <Card className="border-border/40">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Target className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Practice Questions</h3>
                                <p className="text-muted-foreground">
                                    {questions.length} questions available for this topic
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-3 rounded-lg bg-green-500/10">
                                <div className="text-2xl font-bold text-green-600">
                                    {questions.filter(q => q.difficulty?.toLowerCase() === 'easy').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Easy</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {questions.filter(q => !q.difficulty || q.difficulty?.toLowerCase() === 'medium').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Medium</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-red-500/10">
                                <div className="text-2xl font-bold text-red-600">
                                    {questions.filter(q => q.difficulty?.toLowerCase() === 'hard').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Hard</div>
                            </div>
                        </div>

                        <Button
                            onClick={() => setIsPracticing(true)}
                            className="w-full h-12 text-base gradient-primary"
                        >
                            <Play className="w-5 h-5 mr-2" />
                            Start Practice (10 questions)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Complete — show results
    if (isComplete) {
        const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

        return (
            <Card className="border-border/40">
                <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-10 h-10 text-primary" />
                    </div>

                    <h3 className="text-2xl font-bold mb-2">Practice Complete!</h3>
                    <p className="text-muted-foreground mb-6">
                        Here&apos;s how you did on this topic
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
                        <div className="p-4 rounded-xl bg-accent/50">
                            <div className="text-3xl font-bold text-foreground">{sessionTotal}</div>
                            <div className="text-xs text-muted-foreground">Attempted</div>
                        </div>
                        <div className="p-4 rounded-xl bg-green-500/10">
                            <div className="text-3xl font-bold text-green-600">{sessionCorrect}</div>
                            <div className="text-xs text-muted-foreground">Correct</div>
                        </div>
                        <div className="p-4 rounded-xl bg-primary/10">
                            <div className="text-3xl font-bold text-primary">{accuracy}%</div>
                            <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={handleRestart}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Practice Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Active practice
    const isCorrect = isAnswered
        ? checkIsCorrect(currentQuestion.correct_answer, selectedAnswer, currentQuestion.options)
        : null;

    return (
        <div className="space-y-4">
            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                    Question {currentIndex + 1} / {Math.min(questions.length, 10)}
                </span>
                <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${((currentIndex + 1) / Math.min(questions.length, 10)) * 100}%` }}
                    />
                </div>
                <Badge variant="outline" className="text-xs">
                    {sessionCorrect}/{sessionTotal} correct
                </Badge>
            </div>

            {/* Question card */}
            <Card className="border-border/40">
                <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                            {currentQuestion.difficulty || 'Medium'}
                        </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                        <MarkdownText text={currentQuestion.question_text} />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {currentQuestion.options && currentQuestion.options.length > 0 ? (
                        <RadioGroup
                            value={selectedAnswer}
                            onValueChange={setSelectedAnswer}
                            disabled={isAnswered}
                            className="space-y-3"
                        >
                            {currentQuestion.options.map((option, i) => {
                                const optionLabel = String.fromCharCode(65 + i);
                                const isSelected = selectedAnswer === option;
                                const isCorrectOption = isAnswered && checkIsCorrect(
                                    currentQuestion.correct_answer,
                                    option,
                                    currentQuestion.options
                                );
                                const isWrong = isAnswered && isSelected && !isCorrectOption;

                                return (
                                    <Label
                                        key={i}
                                        htmlFor={`option-${i}`}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                            isAnswered && isCorrectOption && "border-green-500 bg-green-500/10",
                                            isWrong && "border-red-500 bg-red-500/10",
                                            !isAnswered && isSelected && "border-primary bg-primary/5",
                                            !isAnswered && !isSelected && "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <RadioGroupItem value={option} id={`option-${i}`} className="sr-only" />
                                        <span className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 shrink-0",
                                            isAnswered && isCorrectOption
                                                ? "bg-green-500 text-white border-green-500"
                                                : isWrong
                                                    ? "bg-red-500 text-white border-red-500"
                                                    : isSelected
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "border-border text-muted-foreground"
                                        )}>
                                            {isAnswered && isCorrectOption ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : isWrong ? (
                                                <XCircle className="w-4 h-4" />
                                            ) : (
                                                optionLabel
                                            )}
                                        </span>
                                        <span className="text-sm flex-1">
                                            <MarkdownText text={option} />
                                        </span>
                                    </Label>
                                );
                            })}
                        </RadioGroup>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            This question has no answer options.
                        </p>
                    )}

                    {/* Explanation */}
                    {isAnswered && currentQuestion.explanation && (
                        <div className="mt-4 p-4 rounded-lg bg-accent/50 border border-border/50">
                            <h4 className="text-sm font-semibold mb-1">Explanation</h4>
                            <div className="text-sm text-muted-foreground">
                                <MarkdownText text={currentQuestion.explanation} />
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-6 flex justify-end">
                        {!isAnswered ? (
                            <Button
                                onClick={handleAnswer}
                                disabled={!selectedAnswer}
                                className="gradient-primary"
                            >
                                Submit Answer
                            </Button>
                        ) : (
                            <Button onClick={handleNext}>
                                {currentIndex + 1 >= Math.min(questions.length, 10) ? 'Finish' : 'Next Question'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
