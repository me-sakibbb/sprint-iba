import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Target, Play, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuestionStatistics } from "@/hooks/useQuestionStatistics";
import { toast } from "sonner";

// Types for Gemini-generated study plan
interface DailyAssignment {
    dayNumber: number;
    date: string;
    subjects: {
        subject: string;
        topic: string;
        easy: number;
        medium: number;
        hard: number;
        totalQuestions: number;
        rationale?: string;
    }[];
    totalQuestions: number;
    focusArea?: string;
}

interface StudyPlan {
    examDate: string;
    daysUntilExam: number;
    totalRemaining: number;
    questionsPerDay: number;
    strategy?: string;
    dailySchedule: DailyAssignment[];
}

const AIStudyPlanner = () => {
    const [examDate, setExamDate] = useState<Date>();
    const [generatedPlan, setGeneratedPlan] = useState<StudyPlan | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<DailyAssignment | null>(null);
    const [generating, setGenerating] = useState(false);

    // Fetch real question statistics from database
    const { subjectStats, loading: statsLoading, error: statsError } = useQuestionStatistics();

    const handleGeneratePlan = async () => {
        if (!examDate || subjectStats.length === 0) return;

        setGenerating(true);
        try {
            // Call Gemini-powered edge function
            const { data, error } = await supabase.functions.invoke('generate-study-plan', {
                body: {
                    examDate: examDate.toISOString().split('T')[0],
                    subjectStats
                }
            });

            if (error) {
                console.error('Supabase function error:', error);
                throw new Error(JSON.stringify(error));
            }

            if (data?.error) {
                console.error('Edge function returned error:', data);
                throw new Error(data.error + (data.details ? ': ' + data.details : ''));
            }

            setGeneratedPlan(data);

            if (data.strategy) {
                toast.success('Study Plan Generated!', {
                    description: data.strategy
                });
            }
        } catch (err: any) {
            console.error('Failed to generate study plan:', err);
            const errorMessage = err?.message || err?.toString() || 'Unknown error';
            toast.error('Failed to Generate Plan', {
                description: errorMessage.substring(0, 200),
                duration: 10000
            });
        } finally {
            setGenerating(false);
        }
    };

    const totalRemaining = subjectStats.reduce((sum, s) => sum + s.totalRemaining, 0);
    const totalQuestions = subjectStats.reduce((sum, s) => sum + s.totalQuestions, 0);
    const progressPercentage = Math.round(((totalQuestions - totalRemaining) / totalQuestions) * 100) || 0;

    // Get difficulty breakdown
    const easyRemaining = subjectStats.reduce((sum, s) =>
        sum + s.topics.reduce((t, topic) => t + topic.breakdown.easy.remaining, 0), 0
    );
    const mediumRemaining = subjectStats.reduce((sum, s) =>
        sum + s.topics.reduce((t, topic) => t + topic.breakdown.medium.remaining, 0), 0
    );
    const hardRemaining = subjectStats.reduce((sum, s) =>
        sum + s.topics.reduce((t, topic) => t + topic.breakdown.hard.remaining, 0), 0
    );

    // Get days in current viewing month
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Map plan to calendar
    const getDayPlan = (date: Date): DailyAssignment | null => {
        if (!generatedPlan) return null;
        return generatedPlan.dailySchedule.find(
            day => format(day.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ) || null;
    };

    const getSubjectColor = (subject: string) => {
        switch (subject) {
            case "Math": return "bg-green-500";
            case "English": return "bg-blue-500";
            case "Analytical": return "bg-purple-500";
            default: return "bg-gray-500";
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/40">
                <CardHeader>
                    <div className="space-y-2">
                        <CardTitle className="text-2xl flex items-center gap-2">
                            🤖 AI Study Planner
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Get a personalized 30-day study plan powered by Gemini AI
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-[350px_1fr] gap-6">
                        {/* Left: Date Selector */}
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <label className="text-sm font-semibold">Set Your Target Exam Date:</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-12",
                                                !examDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {examDate ? format(examDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={examDate}
                                            onSelect={setExamDate}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button
                                className="w-full h-12 gradient-accent text-accent-foreground font-semibold relative overflow-hidden"
                                onClick={handleGeneratePlan}
                                disabled={!examDate || statsLoading || generating || subjectStats.length === 0}
                            >
                                {statsLoading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                        Loading Your Progress...
                                    </>
                                ) : generating ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                        AI Crafting Your Plan...
                                    </>
                                ) : generatedPlan ? (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Regenerate Plan
                                    </>
                                ) : (
                                    <>
                                        🤖 Generate AI Study Plan
                                    </>
                                )}
                            </Button>

                            {/* Description based on state */}
                            {generating ? (
                                <div className="space-y-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                                    <div className="flex items-center gap-2 text-sm font-medium text-accent">
                                        <Loader2 className="animate-spin h-4 w-4" />
                                        <span>Gemini AI is analyzing {totalRemaining} questions...</span>
                                    </div>
                                    <Progress value={33} className="h-1" />
                                    <p className="text-xs text-muted-foreground">
                                        Creating intelligent 30-day schedule with topic prioritization and difficulty progression
                                    </p>
                                </div>
                            ) : generatedPlan ? (
                                <div className="space-y-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Plan Generated Successfully!</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {generatedPlan.dailySchedule?.length || 0} days • {generatedPlan.monthlyGoal || 0} questions this month
                                    </p>
                                    {generatedPlan.strategy && (
                                        <p className="text-xs text-muted-foreground italic">
                                            "{generatedPlan.strategy}"
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    ✨ Powered by Gemini AI - analyzes your progress and creates a personalized 30-day study schedule
                                </p>
                            )}

                            {statsLoading && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="animate-spin h-3 w-3" />
                                    <span>Fetching your question statistics...</span>
                                </div>
                            )}

                            {statsError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                                    Error loading statistics: {statsError}
                                </div>
                            )}
                        </div>

                        {/* Right: Calendar Grid */}
                        <div className="space-y-4">
                            {generatedPlan ? (
                                <>
                                    {/* Month Navigation */}
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCurrentMonth(addDays(monthStart, -1))}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCurrentMonth(addDays(monthEnd, 1))}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-5 gap-3">
                                        {daysInMonth.map((day) => {
                                            const dayPlan = getDayPlan(day);
                                            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                                            return (
                                                <Card
                                                    key={day.toString()}
                                                    className={cn(
                                                        "border-border/40 transition-all hover:shadow-md",
                                                        isToday && "border-accent border-2",
                                                        !dayPlan && "opacity-50"
                                                    )}
                                                >
                                                    <CardContent className="p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className={cn(
                                                                "font-semibold text-sm",
                                                                isToday && "text-accent"
                                                            )}>
                                                                {format(day, 'd')}
                                                            </span>
                                                        </div>

                                                        {dayPlan && (
                                                            <div className="space-y-1.5">
                                                                {dayPlan.subjects.map((subj, idx) => (
                                                                    <div key={idx} className="space-y-0.5 text-xs">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className={cn("w-2 h-2 rounded-full", getSubjectColor(subj.subject))} />
                                                                            <span className="font-medium text-[10px]">{subj.subject}: {subj.easy + subj.medium + subj.hard} Questions</span>
                                                                        </div>
                                                                        <div className="text-[9px] text-muted-foreground pl-3.5">
                                                                            ({subj.easy} Easy, {subj.medium} Medium, {subj.hard} Hard)
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    variant="link"
                                                                    className="h-auto p-0 text-[10px] text-accent"
                                                                    onClick={() => setSelectedDay(dayPlan)}
                                                                >
                                                                    View Daily Details
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                                    <p>Select an exam date and click "Analyze & Plan" to generate your schedule</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Stats */}
                    {generatedPlan && (
                        <div className="grid md:grid-cols-3 gap-6 pt-6 border-t">
                            {/* Total Remaining */}
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Remaining Questions:</p>
                                <p className="text-3xl font-bold text-accent">{totalRemaining.toLocaleString()}</p>
                            </div>

                            {/* Difficulty Breakdown Donut */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-24 h-24">
                                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                            {/* Easy */}
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke="hsl(142 76% 36%)"
                                                strokeWidth="20"
                                                strokeDasharray={`${(easyRemaining / totalRemaining) * 251} 251`}
                                            />
                                            {/* Medium */}
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke="hsl(38 92% 50%)"
                                                strokeWidth="20"
                                                strokeDasharray={`${(mediumRemaining / totalRemaining) * 251} 251`}
                                                strokeDashoffset={-((easyRemaining / totalRemaining) * 251)}
                                            />
                                            {/* Hard */}
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke="hsl(0 72% 51%)"
                                                strokeWidth="20"
                                                strokeDasharray={`${(hardRemaining / totalRemaining) * 251} 251`}
                                                strokeDashoffset={-(((easyRemaining + mediumRemaining) / totalRemaining) * 251)}
                                            />
                                        </svg>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm bg-green-600" />
                                            <span>Easy: {easyRemaining}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm bg-amber-500" />
                                            <span>Medium: {mediumRemaining}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm bg-red-600" />
                                            <span>Hard: {hardRemaining}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress & Target Date */}
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Overall Plan Progress: {progressPercentage}%</p>
                                    <Progress value={progressPercentage} className="h-2" />
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Target className="w-4 h-4 text-accent" />
                                    <span className="font-medium">Target Date:</span>
                                    <span className="text-accent">{examDate && format(examDate, 'MMM d')}, IBA Exam</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Daily Details Dialog */}
            <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl">
                                Daily Study Plan: {selectedDay && format(selectedDay.date, 'MMMM d')}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    {selectedDay && (
                        <div className="space-y-4">
                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">0/{selectedDay.totalQuestions} Questions Completed</span>
                                </div>
                                <Progress value={0} className="h-2" />
                            </div>

                            {/* Subjects Accordion */}
                            <Accordion type="single" collapsible className="w-full">
                                {/* Group subjects */}
                                {Array.from(new Set(selectedDay.subjects.map(s => s.subject))).map((subject) => {
                                    const subjectItems = selectedDay.subjects.filter(s => s.subject === subject);
                                    const totalQuestions = subjectItems.reduce((sum, s) => sum + s.easy + s.medium + s.hard, 0);

                                    return (
                                        <AccordionItem key={subject} value={subject} className="border rounded-lg px-4 mb-2">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <span className="font-semibold">{subject} ({totalQuestions} Questions)</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-3 pt-3">
                                                {subjectItems.map((item, idx) => (
                                                    <div key={idx} className="grid grid-cols-3 gap-3">
                                                        {/* Easy Card */}
                                                        {item.easy > 0 && (
                                                            <Card className="border-green-500/30 bg-green-500/5">
                                                                <CardContent className="p-4 space-y-3">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                                                                                Easy
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-sm font-medium">{item.topic}</p>
                                                                        <p className="text-xs text-muted-foreground">({item.easy} Questions)</p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                                    >
                                                                        <Play className="w-3 h-3 mr-1" />
                                                                        Start Practice
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>
                                                        )}

                                                        {/* Medium Card */}
                                                        {item.medium > 0 && (
                                                            <Card className="border-amber-500/30 bg-amber-500/5">
                                                                <CardContent className="p-4 space-y-3">
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                                                                                Medium
                                                                            </Badge>
                                                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                        </div>
                                                                        <p className="text-sm font-medium">{item.topic}</p>
                                                                        <p className="text-xs text-muted-foreground">({item.medium} Questions)</p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                                                                    >
                                                                        <Play className="w-3 h-3 mr-1" />
                                                                        Start Practice
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>
                                                        )}

                                                        {/* Hard Card */}
                                                        {item.hard > 0 && (
                                                            <Card className="border-red-500/30 bg-red-500/5">
                                                                <CardContent className="p-4 space-y-3">
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                                                                                Hard
                                                                            </Badge>
                                                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                                                        </div>
                                                                        <p className="text-sm font-medium">{item.topic}</p>
                                                                        <p className="text-xs text-muted-foreground">({item.hard} Questions)</p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                                                                    >
                                                                        <Play className="w-3 h-3 mr-1" />
                                                                        Start Practice
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>

                            {/* Mark as Complete Button */}
                            <Button className="w-full gradient-accent text-accent-foreground h-12 font-semibold">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark Day as Complete
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AIStudyPlanner;
