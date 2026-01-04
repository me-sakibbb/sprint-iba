"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Trophy,
    CheckCircle,
    XCircle,
    ArrowLeft,
    ChevronDown,
    Brain,
    Target,
    Medal,
    Crown,
    Sparkles,
    Users
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MarkdownText } from "@/components/MarkdownText";

type Exam = Tables<'exams'>;
type ExamAttempt = Tables<'exam_attempts'>;
type Question = Tables<'questions'>;

interface LeaderboardEntry {
    id: string;
    score: number;
    submitted_at: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

interface ExamResultsProps {
    exam: Exam;
    attempt: ExamAttempt;
    questions: Question[];
    answers: Record<string, string>;
    getLeaderboard: (examId: string) => Promise<any[]>;
    onBack: () => void;
}

export default function ExamResults({
    exam,
    attempt,
    questions,
    answers,
    getLeaderboard,
    onBack
}: ExamResultsProps) {
    const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    useEffect(() => {
        if (exam.show_leaderboard) {
            setLoadingLeaderboard(true);
            getLeaderboard(exam.id)
                .then(data => setLeaderboard(data as LeaderboardEntry[]))
                .catch(console.error)
                .finally(() => setLoadingLeaderboard(false));
        }
    }, [exam.id, exam.show_leaderboard, getLeaderboard]);

    const correctCount = attempt.score;
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

    // Calculate topic breakdown
    const topicStats: Record<string, { correct: number; total: number }> = {};
    questions.forEach(q => {
        const topic = q.topic || 'Other';
        if (!topicStats[topic]) {
            topicStats[topic] = { correct: 0, total: 0 };
        }
        topicStats[topic].total++;
        if (q.correct_answer === answers[q.id]) {
            topicStats[topic].correct++;
        }
    });

    // Find user rank
    const userRank = leaderboard.findIndex(e => e.id === attempt.id) + 1;

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl">
            {/* Back Button */}
            <Button variant="ghost" onClick={onBack} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Exams
            </Button>

            {/* Score Summary */}
            <Card className="border-border/40 mb-8 overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-8">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold mb-2 text-muted-foreground">{exam.title}</h2>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Trophy className={`w-12 h-12 ${getScoreColor()}`} />
                        </div>
                        <h1 className="text-4xl font-bold mb-2">
                            <span className={getScoreColor()}>{correctCount}</span>
                            <span className="text-muted-foreground"> / {questions.length}</span>
                        </h1>
                        <p className="text-xl text-muted-foreground mb-4">{getScoreMessage()}</p>

                        {userRank > 0 && (
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <Medal className="w-5 h-5 text-primary" />
                                <span className="font-semibold">Rank #{userRank}</span>
                            </div>
                        )}

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

            <Tabs defaultValue={exam.show_results_immediately ? "review" : (exam.show_leaderboard ? "leaderboard" : "breakdown")}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    {exam.show_results_immediately && (
                        <TabsTrigger value="review">
                            <Brain className="w-4 h-4 mr-2" />
                            Review
                        </TabsTrigger>
                    )}
                    {exam.show_leaderboard && (
                        <TabsTrigger value="leaderboard">
                            <Trophy className="w-4 h-4 mr-2" />
                            Leaderboard
                        </TabsTrigger>
                    )}
                    {exam.show_topic_breakdown && (
                        <TabsTrigger value="breakdown">
                            <Target className="w-4 h-4 mr-2" />
                            Breakdown
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Question Review */}
                {exam.show_results_immediately && (
                    <TabsContent value="review">
                        <Card className="border-border/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" />
                                    Question Review
                                </CardTitle>
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
                                                                <span className="font-semibold">Question {index + 1}</span>
                                                                <p className="text-sm text-muted-foreground truncate">
                                                                    {question.question_text.substring(0, 80)}...
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
                                                            <div>
                                                                <h4 className="text-sm font-semibold mb-2">Question</h4>
                                                                <MarkdownText text={question.question_text} />
                                                            </div>

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
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {question.explanation && !isCorrect && (
                                                                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Sparkles className="w-4 h-4 text-primary" />
                                                                        <h4 className="text-sm font-semibold">Explanation</h4>
                                                                    </div>
                                                                    <MarkdownText text={question.explanation} />
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
                    </TabsContent>
                )}

                {/* Leaderboard */}
                {exam.show_leaderboard && (
                    <TabsContent value="leaderboard">
                        <Card className="border-border/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-primary" />
                                    Leaderboard
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-2">
                                        {leaderboard.map((entry, idx) => {
                                            const isCurrentUser = entry.id === attempt.id;

                                            return (
                                                <div
                                                    key={entry.id}
                                                    className={`flex items-center gap-4 p-4 rounded-xl ${isCurrentUser
                                                        ? 'bg-primary/10 border border-primary/30'
                                                        : 'bg-muted/30'
                                                        }`}
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center">
                                                        {idx === 0 ? (
                                                            <Crown className="w-6 h-6 text-yellow-500" />
                                                        ) : idx === 1 ? (
                                                            <Medal className="w-6 h-6 text-gray-400" />
                                                        ) : idx === 2 ? (
                                                            <Medal className="w-6 h-6 text-amber-700" />
                                                        ) : (
                                                            <span className="font-bold text-muted-foreground">{idx + 1}</span>
                                                        )}
                                                    </div>

                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={entry.profiles?.avatar_url || ''} />
                                                        <AvatarFallback>
                                                            {entry.profiles?.full_name?.[0] || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex-1">
                                                        <div className="font-semibold">
                                                            {entry.profiles?.full_name || 'Anonymous'}
                                                            {isCurrentUser && <Badge className="ml-2">You</Badge>}
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="font-bold">{entry.score}/{questions.length}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {Math.round((entry.score / questions.length) * 100)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Topic Breakdown */}
                {exam.show_topic_breakdown && (
                    <TabsContent value="breakdown">
                        <Card className="border-border/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-primary" />
                                    Topic Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(topicStats).map(([topic, stats]) => {
                                        const pct = Math.round((stats.correct / stats.total) * 100);

                                        return (
                                            <div key={topic} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">{topic}</span>
                                                    <span className="text-muted-foreground">
                                                        {stats.correct}/{stats.total} ({pct}%)
                                                    </span>
                                                </div>
                                                <Progress value={pct} className="h-2" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
