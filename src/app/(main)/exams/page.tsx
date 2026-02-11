"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useExam } from "@/hooks/useExam";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Clock,
    Play,
    Trophy,
    Calendar,
    CheckCircle,
    Lock,
    Loader2,
    FileText,
    Users,
    Timer,
    RotateCcw
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import ExamSession from "@/components/exam/ExamSession";
import ExamResults from "@/components/exam/ExamResults";

export default function ExamsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const {
        loading,
        error,
        exams,
        exam,
        attempt,
        questions,
        passages,
        currentQuestion,
        currentIndex,
        answers,
        timeRemaining,
        isSubmitted,
        startExam,
        saveAnswer,
        goToQuestion,
        submitExam,
        resetExam,
        setTimeRemaining,
        getLeaderboard
    } = useExam();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    // If in active exam, show session
    if (exam && attempt && !isSubmitted) {
        return (
            <ExamSession
                exam={exam}
                questions={questions}
                passages={passages}
                currentQuestion={currentQuestion}
                currentIndex={currentIndex}
                answers={answers}
                timeRemaining={timeRemaining}
                onAnswer={saveAnswer}
                onNavigate={goToQuestion}
                onSubmit={submitExam}
                setTimeRemaining={setTimeRemaining}
            />
        );
    }

    // If exam completed, show results
    if (exam && attempt && isSubmitted) {
        return (
            <ExamResults
                exam={exam}
                attempt={attempt}
                questions={questions}
                answers={answers}
                getLeaderboard={getLeaderboard}
                onBack={resetExam}
            />
        );
    }

    // Separate exams by type
    const mockExams = exams.filter(e => e.type === 'mock');
    const liveExams = exams.filter(e => e.type === 'live');

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Exams</h1>
                        <p className="text-muted-foreground">Take mock exams or participate in live competitions</p>
                    </div>
                </div>
            </div>

            {error && (
                <Card className="border-destructive bg-destructive/10 mb-6">
                    <CardContent className="p-4">
                        <span className="text-destructive">{error}</span>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="mock" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mock" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Mock Exams ({mockExams.length})
                    </TabsTrigger>
                    <TabsTrigger value="live" className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Live Exams ({liveExams.length})
                    </TabsTrigger>
                </TabsList>

                {/* Mock Exams */}
                <TabsContent value="mock" className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : mockExams.length === 0 ? (
                        <Card className="border-border/40">
                            <CardContent className="py-12 text-center">
                                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Mock Exams Available</h3>
                                <p className="text-muted-foreground">Check back later for new practice exams.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {mockExams.map((exam) => (
                                <ExamCard
                                    key={exam.id}
                                    exam={exam}
                                    onStart={() => startExam(exam.id)}
                                    loading={loading}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Live Exams */}
                <TabsContent value="live" className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : liveExams.length === 0 ? (
                        <Card className="border-border/40">
                            <CardContent className="py-12 text-center">
                                <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Live Exams Scheduled</h3>
                                <p className="text-muted-foreground">Check back later for upcoming competitions.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {liveExams.map((exam) => (
                                <ExamCard
                                    key={exam.id}
                                    exam={exam}
                                    onStart={() => startExam(exam.id)}
                                    loading={loading}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

interface ExamCardProps {
    exam: any;
    onStart: () => void;
    loading: boolean;
}

function ExamCard({ exam, onStart, loading }: ExamCardProps) {
    const getStatusBadge = () => {
        switch (exam.status) {
            case 'upcoming':
                return <Badge variant="outline" className="border-blue-500 text-blue-500">Upcoming</Badge>;
            case 'active':
                return <Badge className="bg-green-500">Live Now</Badge>;
            case 'ended':
                return <Badge variant="secondary">Ended</Badge>;
            default:
                return <Badge variant="outline">Available</Badge>;
        }
    };

    return (
        <Card className="border-border/40 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{exam.title}</h3>
                            {getStatusBadge()}
                            {exam.userAttempt?.is_submitted && (
                                <Badge className="bg-primary">
                                    Score: {exam.userAttempt.score}/{exam.userAttempt.total_questions}
                                </Badge>
                            )}
                        </div>

                        {exam.description && (
                            <p className="text-muted-foreground text-sm mb-4">{exam.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {exam.question_ids?.length || 0} questions
                            </div>
                            <div className="flex items-center gap-1">
                                <Timer className="w-4 h-4" />
                                {exam.duration_minutes} minutes
                            </div>
                            {exam.start_time && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {exam.status === 'upcoming'
                                        ? `Starts ${formatDistanceToNow(new Date(exam.start_time), { addSuffix: true })}`
                                        : format(new Date(exam.start_time), 'MMM d, yyyy h:mm a')
                                    }
                                </div>
                            )}
                            {exam.allow_retake && (
                                <div className="flex items-center gap-1">
                                    <RotateCcw className="w-4 h-4" />
                                    Retakes allowed
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={onStart}
                        disabled={!exam.canTake || loading}
                        className={exam.canTake ? 'gradient-primary' : ''}
                    >
                        {!exam.canTake ? (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                {exam.status === 'upcoming' ? 'Not Yet' : exam.status === 'ended' ? 'Ended' : 'Completed'}
                            </>
                        ) : exam.userAttempt && !exam.userAttempt.is_submitted ? (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </>
                        ) : exam.userAttempt?.is_submitted && exam.allow_retake ? (
                            <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Retake
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Exam
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
