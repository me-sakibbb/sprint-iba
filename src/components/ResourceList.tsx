"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ChevronRight,
    Star,
    CheckCircle,
    PlayCircle,
    BookOpen,
    Loader2,
    AlertCircle,
    Calculator,
    Circle,
    PenTool,
    Languages,
    Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// --- Types ---
interface Skill {
    id: string; // "Basic", "Intermediate", "Advanced"
    name: string; // Display name
    status: "mastered" | "proficient" | "familiar" | "not-started";
    questionCount: number;
    correctCount: number;
}

interface Unit {
    id: string; // Subtopic name
    title: string;
    progress: number;
    skills: Skill[];
}

interface WrongQuestion {
    id: string;
    unitId: string;
}

interface ResourceListProps {
    subject: string;
}

// Topic Mapping (Legacy Support)
const topicMap: Record<string, string[]> = {
    math: ["Algebra", "Arithmetic", "Geometry", "Trigonometry", "Calculus", "Data Analysis", "Statistics", "Number Properties", "Word Problems", "Math"],
    english: ["Sentence Correction", "Reading Comprehension", "Vocabulary", "Grammar", "Critical Reasoning", "English"],
    analytical: ["Analytical Reasoning", "Logic", "Analytical", "Puzzles"]
};

// Subject Icons
const SubjectIcon = ({ subject }: { subject: string }) => {
    const s = subject.toLowerCase();
    if (s === 'math') return <Calculator className="w-6 h-6" />;
    if (s === 'english') return <Languages className="w-6 h-6" />;
    if (s === 'analytical') return <PenTool className="w-6 h-6" />;
    return <BookOpen className="w-6 h-6" />;
};

const ResourceList = ({ subject }: ResourceListProps) => {
    const { user } = useAuth();
    const router = useRouter();
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUnitId, setSelectedUnitId] = useState<string>("");
    const [courseProgress, setCourseProgress] = useState(0);
    const [totalSkillsCount, setTotalSkillsCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // 1. Determine relevant topics to fetch
                const subjectKey = subject.toLowerCase();
                const searchTopics = topicMap[subjectKey] || [subject.charAt(0).toUpperCase() + subject.slice(1)];

                // 2. Fetch Questions
                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('id, subtopic, topic, difficulty')
                    .in('topic', searchTopics);

                if (questionsError) throw questionsError;

                // 3. Fetch User Progress
                const { data: progressData, error: progressError } = await supabase
                    .from('user_progress')
                    .select('question_id, is_correct')
                    .eq('user_id', user.id);

                if (progressError) throw progressError;

                // 4. Process Data
                const progressMap = new Map<string, boolean>();
                if (progressData) {
                    progressData.forEach(p => progressMap.set(p.question_id, p.is_correct));
                }

                const subtopicGroups = new Map<string, {
                    Basic: { total: number, correct: number },
                    Intermediate: { total: number, correct: number },
                    Advanced: { total: number, correct: number }
                }>();

                const wrongQs: WrongQuestion[] = [];
                let totalQuestions = 0;
                let totalCorrect = 0;

                questionsData?.forEach(q => {
                    totalQuestions++;
                    // Normalize Subtopic
                    let subtopic = q.subtopic || "General";
                    // If subtopic is empty or same as subject, try to use Topic if distinct, else "General"
                    if (!subtopic || subtopic === subject) subtopic = q.topic || "General";

                    const diff = (q.difficulty || 'Medium');
                    const isCorrect = progressMap.get(q.id) === true;

                    if (isCorrect) totalCorrect++;
                    if (progressMap.has(q.id) && !isCorrect) {
                        wrongQs.push({ id: q.id, unitId: subtopic });
                    }

                    if (!subtopicGroups.has(subtopic)) {
                        subtopicGroups.set(subtopic, {
                            Basic: { total: 0, correct: 0 },
                            Intermediate: { total: 0, correct: 0 },
                            Advanced: { total: 0, correct: 0 }
                        });
                    }

                    const counts = subtopicGroups.get(subtopic)!;

                    // Map difficulties (case-insensitive)
                    const d = diff.toLowerCase();
                    if (d === 'easy' || d === 'basic') {
                        counts.Basic.total++;
                        if (isCorrect) counts.Basic.correct++;
                    } else if (d === 'hard' || d === 'advanced') {
                        counts.Advanced.total++;
                        if (isCorrect) counts.Advanced.correct++;
                    } else {
                        // Default to Intermediate/Medium
                        counts.Intermediate.total++;
                        if (isCorrect) counts.Intermediate.correct++;
                    }
                });

                // 5. Build Units & Skills
                const newUnits: Unit[] = [];

                // Helper: logic from reference to calc status
                const getStatus = (correct: number, total: number) => {
                    if (total === 0) return "not-started";
                    if (correct === 0) return "not-started"; // Or attempted if we tracked attempts specifically
                    const pct = (correct / total) * 100;
                    if (pct >= 90) return "mastered";
                    if (pct >= 70) return "proficient";
                    return "familiar";
                };

                const sortedSubtopics = Array.from(subtopicGroups.keys()).sort();

                sortedSubtopics.forEach(subtopic => {
                    const counts = subtopicGroups.get(subtopic)!;
                    const skills: Skill[] = [];

                    // Create standard skills (Basic, Inter, Adv)
                    const skillTypes = [
                        { id: "Basic", label: "Basic", data: counts.Basic },
                        { id: "Intermediate", label: "Intermediate", data: counts.Intermediate },
                        { id: "Advanced", label: "Advanced", data: counts.Advanced }
                    ];

                    skillTypes.forEach(s => {
                        if (s.data.total > 0) {
                            skills.push({
                                id: s.id,
                                name: s.label,
                                status: getStatus(s.data.correct, s.data.total),
                                questionCount: s.data.total,
                                correctCount: s.data.correct
                            });
                        }
                    });

                    // Add "Mistakes Review" if applicable
                    const unitMistakes = wrongQs.filter(wq => wq.unitId === subtopic).length;
                    if (unitMistakes > 0) {
                        skills.unshift({
                            id: "mistakes",
                            name: "Mistakes Review",
                            status: "familiar", // Special status
                            questionCount: unitMistakes,
                            correctCount: 0
                        });
                    }

                    // Calculate Unit Progress
                    const unitTotalQ = skills.reduce((acc, s) => s.id !== 'mistakes' ? acc + s.questionCount : acc, 0);
                    const unitTotalC = skills.reduce((acc, s) => s.id !== 'mistakes' ? acc + s.correctCount : acc, 0);
                    const unitProgress = unitTotalQ > 0 ? Math.round((unitTotalC / unitTotalQ) * 100) : 0;

                    if (skills.length > 0) {
                        newUnits.push({
                            id: subtopic,
                            title: subtopic,
                            progress: unitProgress,
                            skills
                        });
                    }
                });

                setUnits(newUnits);
                setCourseProgress(totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
                setTotalSkillsCount(newUnits.reduce((acc, u) => acc + u.skills.length, 0));

                if (newUnits.length > 0 && !selectedUnitId) {
                    setSelectedUnitId(newUnits[0].id);
                }

            } catch (error) {
                console.error("Error fetching resource data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [subject, user]);

    // Navigate to practice
    const handlePractice = (unitId: string, skillId: string) => {
        // Since step 214 showed that PracticePage mostly respects 'mode' param
        // we will do a basic redirect to Practice. 
        // In a real implementation we would want to pass the unit and skill filter to PracticePage
        router.push('/practice');
    };

    const selectedUnit = units.find(u => u.id === selectedUnitId) || units[0];

    const getStatusColor = (status: string, isMistake = false) => {
        if (isMistake) return "bg-red-100 text-red-500";
        switch (status) {
            case "mastered": return "bg-green-500 text-white";
            case "proficient": return "bg-blue-500 text-white";
            case "familiar": return "bg-orange-400 text-white";
            default: return "bg-muted text-muted-foreground";
        }
    };

    const getStatusIcon = (status: string, isMistake = false) => {
        if (isMistake) return <AlertCircle className="w-4 h-4" />;
        switch (status) {
            case "mastered": return <Star className="w-4 h-4 fill-current" />;
            case "proficient": return <CheckCircle className="w-4 h-4" />;
            case "familiar": return <PlayCircle className="w-4 h-4" />;
            default: return <Circle className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Main Layout matches the reference: Sidebar (Units) + Main Area */}

            {/* Units Sidebar */}
            <div className="w-80 border-r border-border/40 bg-card/30 overflow-y-auto p-4 hidden lg:block shrink-0">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                    Course Units
                </h3>
                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {units.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-2">No units found.</p>
                        ) : (
                            units.map((unit) => (
                                <button
                                    key={unit.id}
                                    onClick={() => setSelectedUnitId(unit.id)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group",
                                        selectedUnitId === unit.id
                                            ? "bg-primary/10 text-primary border-l-4 border-primary"
                                            : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span className="truncate max-w-[180px]">{unit.title}</span>
                                    {unit.progress > 0 && (
                                        <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
                                            {unit.progress}%
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Section */}
                <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl p-6 z-10 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <SubjectIcon subject={subject} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold capitalize">{subject} Mastery</h1>
                                <p className="text-sm text-muted-foreground">
                                    {loading ? "Loading..." : `${totalSkillsCount} Skills Available`}
                                </p>
                            </div>
                        </div>
                        <Button className="gradient-primary" onClick={() => router.push('/practice')}>
                            <Trophy className="w-4 h-4 mr-2" />
                            Course Challenge
                        </Button>
                    </div>
                    <Progress value={courseProgress} className="h-2" />
                </div>

                {/* Main Scroll Area */}
                <ScrollArea className="flex-1 p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-muted-foreground">Loading your personalized learning plan...</p>
                            </div>
                        ) : selectedUnit ? (
                            <>
                                {/* Selected Unit Header */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="capitalize">{subject}</span>
                                        <ChevronRight className="w-4 h-4" />
                                        <span className="text-foreground font-medium">{selectedUnit.title}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-3xl font-bold tracking-tight">{selectedUnit.title}</h2>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">{selectedUnit.progress}%</div>
                                            <div className="text-xs text-muted-foreground">Mastery</div>
                                        </div>
                                    </div>
                                    <Progress value={selectedUnit.progress} className="h-2" />

                                    {/* Legend */}
                                    <div className="flex flex-wrap items-center gap-4 pt-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                            <span>Mastered</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                            <span>Proficient</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                                            <span>Familiar</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="w-3 h-3 rounded-full bg-muted border border-border"></span>
                                            <span>Not started</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Grid */}
                                <div className="grid gap-4">
                                    {selectedUnit.skills.map((skill) => {
                                        const isMistake = skill.id === 'mistakes';
                                        return (
                                            <Card key={skill.id} className={cn(
                                                "border-border/40 hover:border-primary/20 transition-colors",
                                                isMistake && "border-red-200 bg-red-50/10 hover:bg-red-50/20"
                                            )}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-2 rounded-full", getStatusColor(skill.status, isMistake))}>
                                                            {getStatusIcon(skill.status, isMistake)}
                                                        </div>
                                                        <div>
                                                            <h4 className={cn("font-semibold", isMistake && "text-red-500")}>
                                                                {skill.name}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground">
                                                                {isMistake
                                                                    ? `${skill.questionCount} Questions to Review`
                                                                    : `${skill.correctCount} / ${skill.questionCount} Correct`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant={isMistake ? "destructive" : "ghost"}
                                                        size="sm"
                                                        onClick={() => handlePractice(selectedUnit.id, skill.id)}
                                                    >
                                                        {isMistake ? "Review" : "Practice"}
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Unit Test Card */}
                                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-primary" />
                                                Unit Test
                                            </h3>
                                            <p className="text-muted-foreground">Test your knowledge of {selectedUnit.title}</p>
                                        </div>
                                        <Button onClick={() => router.push('/practice')}>Start Test</Button>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground mb-4">No content available for this subject yet.</p>
                                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                                    Go to Dashboard
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default ResourceList;
