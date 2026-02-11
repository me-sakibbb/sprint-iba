"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePractice } from "@/hooks/usePractice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BookOpen,
    Clock,
    Infinity,
    Play,
    CheckCircle,
    XCircle,
    ArrowRight,
    Timer,
    RotateCcw,
    Loader2,
    Brain,
    Sparkles,
    AlertCircle,
    Eye,
    EyeOff
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import PracticeSession from "@/components/practice/PracticeSession";
import PracticeResults from "@/components/practice/PracticeResults";
import { TaxonomySelector } from "@/components/practice/TaxonomySelector";


function PracticeContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const {
        loading,
        error,
        session,
        questions,
        currentQuestion,
        currentIndex,
        answers,
        isComplete,
        startSession,
        submitAnswer,
        nextQuestion,
        completeSession,
        resetSession,
        timeRemaining,
        setTimeRemaining,
        totalVpEarned,
        passages
    } = usePractice();

    const searchParams = useSearchParams();

    // Configuration state
    const [mode, setMode] = useState<'timed' | 'untimed'>('untimed');
    const [practiceType, setPracticeType] = useState<'normal' | 'mistakes'>('normal');
    const [timePerQuestion, setTimePerQuestion] = useState(60);
    const [questionCount, setQuestionCount] = useState(10);
    const [selectedIds, setSelectedIds] = useState<string[]>(['Overall']);
    const [feedbackMode, setFeedbackMode] = useState<'immediate' | 'deferred'>('immediate');

    useEffect(() => {
        const modeParam = searchParams.get('mode');
        if (modeParam === 'mistakes') {
            setPracticeType('mistakes');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    const handleStartPractice = () => {
        startSession({
            mode,
            timePerQuestion: mode === 'timed' ? timePerQuestion : undefined,
            selectedIds: selectedIds.length === 0 ? ['Overall'] : selectedIds,
            questionCount,
            practiceMode: practiceType,
            feedbackMode,
        });
    };

    // If in active session, show session component
    if (session && !isComplete) {
        return (
            <PracticeSession
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={questions.length}
                mode={mode}
                timeRemaining={timeRemaining}
                onAnswer={submitAnswer}
                onNext={nextQuestion}
                onComplete={completeSession}
                onTimeUp={() => {
                    submitAnswer('', timePerQuestion);
                    nextQuestion();
                }}
                setTimeRemaining={setTimeRemaining}
                timePerQuestion={timePerQuestion}
                feedbackMode={feedbackMode}
                passages={passages}
            />
        );
    }

    // If session complete, show results
    if (session && isComplete) {
        return (
            <PracticeResults
                session={session}
                questions={questions}
                answers={answers}
                onRetry={resetSession}
                vpEarned={totalVpEarned}
                passages={passages}
            />
        );
    }

    // Show configuration screen
    return (
        <div className="container mx-auto px-6 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                        <Brain className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Practice Mode</h1>
                        <p className="text-muted-foreground">Train your skills with targeted practice</p>
                    </div>
                </div>
            </div>

            {error && (
                <Card className="border-destructive bg-destructive/10 mb-6">
                    <CardContent className="p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className="text-destructive">{error}</span>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                {/* Practice Type Selection */}
                <Card className="border-border/40">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            Practice Type
                        </CardTitle>
                        <CardDescription>Choose what questions you want to focus on</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={practiceType}
                            onValueChange={(v) => setPracticeType(v as 'normal' | 'mistakes')}
                            className="grid grid-cols-2 gap-4"
                        >
                            <Label
                                htmlFor="normal"
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${practiceType === 'normal'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <RadioGroupItem value="normal" id="normal" className="sr-only" />
                                <BookOpen className="w-8 h-8 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold">Normal Practice</div>
                                    <div className="text-sm text-muted-foreground">New questions you haven't answered</div>
                                </div>
                            </Label>
                            <Label
                                htmlFor="mistakes"
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${practiceType === 'mistakes'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <RadioGroupItem value="mistakes" id="mistakes" className="sr-only" />
                                <AlertCircle className="w-8 h-8 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold">Mistakes Only</div>
                                    <div className="text-sm text-muted-foreground">Focus on your weak areas</div>
                                </div>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Mode Selection */}
                <Card className="border-border/40">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Timer className="w-5 h-5 text-primary" />
                            Practice Mode
                        </CardTitle>
                        <CardDescription>Choose how you want to practice</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={mode}
                            onValueChange={(v) => setMode(v as 'timed' | 'untimed')}
                            className="grid grid-cols-2 gap-4"
                        >
                            <Label
                                htmlFor="untimed"
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${mode === 'untimed'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <RadioGroupItem value="untimed" id="untimed" className="sr-only" />
                                <Infinity className="w-8 h-8 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold">Untimed</div>
                                    <div className="text-sm text-muted-foreground">Take your time</div>
                                </div>
                            </Label>
                            <Label
                                htmlFor="timed"
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${mode === 'timed'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <RadioGroupItem value="timed" id="timed" className="sr-only" />
                                <Clock className="w-8 h-8 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold">Timed</div>
                                    <div className="text-sm text-muted-foreground">Challenge yourself</div>
                                </div>
                            </Label>
                        </RadioGroup>

                        {mode === 'timed' && (
                            <div className="mt-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Time per question</span>
                                    <span className="font-semibold">{timePerQuestion} seconds</span>
                                </div>
                                <Slider
                                    value={[timePerQuestion]}
                                    onValueChange={([v]) => setTimePerQuestion(v)}
                                    min={15}
                                    max={120}
                                    step={15}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Feedback Mode Selection */}
                <Card className="border-border/40">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Eye className="w-5 h-5 text-primary" />
                            Feedback Mode
                        </CardTitle>
                        <CardDescription>Choose when to see answers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={feedbackMode}
                            onValueChange={(v) => setFeedbackMode(v as 'immediate' | 'deferred')}
                            className="grid grid-cols-2 gap-4"
                        >
                            <Label
                                htmlFor="immediate"
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${feedbackMode === 'immediate'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <RadioGroupItem value="immediate" id="immediate" className="sr-only" />
                                <Eye className="w-8 h-8 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold">Immediate</div>
                                    <div className="text-sm text-muted-foreground">See answers as you go</div>
                                </div>
                            </Label>
                            <Label
                                htmlFor="deferred"
                                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${feedbackMode === 'deferred'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <RadioGroupItem value="deferred" id="deferred" className="sr-only" />
                                <EyeOff className="w-8 h-8 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold">Deferred</div>
                                    <div className="text-sm text-muted-foreground">See results at the end</div>
                                </div>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Question Count */}
                <Card className="border-border/40">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Question Count
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Number of questions</span>
                                <span className="font-semibold">{questionCount} questions</span>
                            </div>
                            <Slider
                                value={[questionCount]}
                                onValueChange={([v]) => setQuestionCount(v)}
                                min={5}
                                max={50}
                                step={5}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Topic Selection */}
                <Card className="border-border/40">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Select Topics
                        </CardTitle>
                        <CardDescription>Choose what you want to practice</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TaxonomySelector
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                        />
                    </CardContent>
                </Card>

                {/* Start Button */}
                <Button
                    onClick={handleStartPractice}
                    disabled={loading}
                    className="w-full h-14 text-lg gradient-primary"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Loading Questions...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 mr-2" />
                            Start Practice
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default function PracticePage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <PracticeContent />
        </Suspense>
    );
}
