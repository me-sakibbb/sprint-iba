import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Calculator,
    ChevronRight,
    Star,
    Trophy,
    CheckCircle2,
    Circle,
    PlayCircle,
    BookOpen,
    Loader2,
    AlertCircle,
    RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types for our dynamic data
interface Skill {
    name: string;
    status: "mastered" | "proficient" | "familiar" | "not-started";
    questionCount?: number;
    correctCount?: number;
}

interface Unit {
    id: string; // Changed to string to support dynamic subtopics
    title: string;
    progress: number;
    skills: Skill[];
}

interface WrongQuestion {
    id: string;
    text: string;
    subtopic: string;
    unitId: string;
    skillId: string;
}

const MathResources = () => {
    const [selectedUnitId, setSelectedUnitId] = useState<string>("");
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
    const [courseProgress, setCourseProgress] = useState(0);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. Fetch all math questions
                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('id, question_text, subtopic, difficulty')
                    .eq('topic', 'Math');

                // 2. Fetch user progress if logged in
                let userProgressMap = new Map<string, { isCorrect: boolean, timestamp: string }>();
                if (user) {
                    try {
                        const { data: progressData, error: progressError } = await supabase
                            .from('user_progress')
                            .select('question_id, is_correct, created_at')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: true });

                        if (progressError) {
                            console.warn("Error fetching user progress:", progressError);
                        } else if (progressData) {
                            progressData.forEach(p => {
                                userProgressMap.set(p.question_id, {
                                    isCorrect: p.is_correct,
                                    timestamp: p.created_at
                                });
                            });
                        }
                    } catch (err) {
                        console.warn("Exception fetching user progress:", err);
                    }
                }

                if (questionsData) {
                    let totalQuestions = 0;
                    let totalCorrect = 0;
                    const wrongQs: WrongQuestion[] = [];

                    // Group questions by subtopic (Unit)
                    const subtopicGroups = new Map<string, {
                        Basic: { total: number, correct: number },
                        Intermediate: { total: number, correct: number },
                        Advanced: { total: number, correct: number }
                    }>();

                    questionsData.forEach(q => {
                        totalQuestions++;
                        const subtopic = q.subtopic || "Miscellaneous"; // Default if missing
                        const diff = (q.difficulty || 'Medium').trim();
                        const progress = userProgressMap.get(q.id);
                        const isCorrect = progress?.isCorrect || false;

                        if (isCorrect) totalCorrect++;

                        // Initialize group if not exists
                        if (!subtopicGroups.has(subtopic)) {
                            subtopicGroups.set(subtopic, {
                                Basic: { total: 0, correct: 0 },
                                Intermediate: { total: 0, correct: 0 },
                                Advanced: { total: 0, correct: 0 }
                            });
                        }

                        const counts = subtopicGroups.get(subtopic)!;
                        let skillId = 'Intermediate';

                        if (diff === 'Easy') {
                            counts.Basic.total++;
                            if (isCorrect) counts.Basic.correct++;
                            skillId = 'Basic';
                        } else if (diff === 'Medium') {
                            counts.Intermediate.total++;
                            if (isCorrect) counts.Intermediate.correct++;
                            skillId = 'Intermediate';
                        } else if (diff === 'Hard') {
                            counts.Advanced.total++;
                            if (isCorrect) counts.Advanced.correct++;
                            skillId = 'Advanced';
                        }

                        // Identify wrong questions
                        if (progress && !progress.isCorrect) {
                            wrongQs.push({
                                id: q.id,
                                text: q.question_text,
                                subtopic: subtopic,
                                unitId: subtopic, // Use subtopic name as ID
                                skillId
                            });
                        }
                    });

                    setCourseProgress(totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
                    setWrongQuestions(wrongQs);

                    // Create Units from groups
                    const newUnits: Unit[] = [];

                    // Helper to create skills array
                    const createSkills = (counts: any): Skill[] => {
                        return [
                            { name: "Basic", total: counts.Basic.total, correct: counts.Basic.correct },
                            { name: "Intermediate", total: counts.Intermediate.total, correct: counts.Intermediate.correct },
                            { name: "Advanced", total: counts.Advanced.total, correct: counts.Advanced.correct }
                        ].filter(s => s.total > 0).map(s => {
                            let status: "not-started" | "familiar" | "proficient" | "mastered" = "not-started";
                            const percentage = s.total > 0 ? (s.correct / s.total) * 100 : 0;

                            if (s.correct > 0) {
                                if (percentage >= 90) status = "mastered";
                                else if (percentage >= 70) status = "proficient";
                                else status = "familiar";
                            }

                            return {
                                name: s.name,
                                status: status,
                                questionCount: s.total,
                                correctCount: s.correct
                            };
                        });
                    };

                    // Convert map to array and sort alphabetically
                    const sortedSubtopics = Array.from(subtopicGroups.keys()).sort();

                    sortedSubtopics.forEach(subtopic => {
                        const counts = subtopicGroups.get(subtopic);
                        const skills = createSkills(counts);

                        // Check for wrong questions for this unit
                        const unitWrongCount = wrongQs.filter(q => q.unitId === subtopic).length;
                        if (unitWrongCount > 0) {
                            skills.unshift({
                                name: "Mistakes Review",
                                status: "familiar",
                                questionCount: unitWrongCount,
                                correctCount: 0
                            });
                        }

                        const unitTotalQuestions = skills.reduce((acc, s) => acc + (s.questionCount || 0), 0);
                        const unitTotalCorrect = skills.reduce((acc, s) => acc + (s.correctCount || 0), 0);
                        const unitProgress = unitTotalQuestions > 0 ? Math.round((unitTotalCorrect / unitTotalQuestions) * 100) : 0;

                        newUnits.push({
                            id: subtopic,
                            title: subtopic,
                            progress: unitProgress,
                            skills
                        });
                    });

                    setUnits(newUnits);
                    if (newUnits.length > 0 && !selectedUnitId) {
                        setSelectedUnitId(newUnits[0].id);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const selectedUnit = units.find(u => u.id === selectedUnitId) || units[0];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "mastered": return "bg-green-500 text-white";
            case "proficient": return "bg-blue-500 text-white";
            case "familiar": return "bg-orange-400 text-white";
            default: return "bg-muted text-muted-foreground";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "mastered": return <Star className="w-4 h-4 fill-current" />;
            case "proficient": return <CheckCircle2 className="w-4 h-4" />;
            case "familiar": return <PlayCircle className="w-4 h-4" />;
            default: return <Circle className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Header */}
                <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl p-6 z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Calculator className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Math Mastery</h1>
                                <p className="text-sm text-muted-foreground">
                                    {loading ? "Loading..." : `${units.reduce((acc, u) => acc + u.skills.length, 0)} Topics Available`}
                                </p>
                            </div>
                        </div>
                        <Button className="gradient-primary">
                            <Trophy className="w-4 h-4 mr-2" />
                            Course Challenge
                        </Button>
                    </div>
                    <Progress value={courseProgress} className="h-2" />
                </div>

                {/* Content Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Units Sidebar */}
                    <div className="w-80 border-r border-border/40 bg-card/30 overflow-y-auto p-4 hidden lg:block">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                            Course Units
                        </h3>
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {units.map((unit) => (
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
                                        <span className="truncate">{unit.title}</span>
                                        {unit.progress > 0 && (
                                            <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
                                                {unit.progress}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <ScrollArea className="flex-1 p-6 lg:p-8">
                        <div className="max-w-4xl mx-auto space-y-8">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-muted-foreground">Loading your personalized learning plan...</p>
                                </div>
                            ) : selectedUnit ? (
                                <>
                                    {/* Unit Header */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>Math</span>
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

                                        <div className="flex items-center gap-4 pt-2">
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
                                        {selectedUnit.skills.map((skill, index) => (
                                            <Card key={index} className={cn(
                                                "border-border/40 hover:border-primary/20 transition-colors",
                                                skill.name === "Mistakes Review" && "border-red-200 bg-red-50/10 hover:bg-red-50/20"
                                            )}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-2 rounded-full",
                                                            skill.name === "Mistakes Review" ? "bg-red-100 text-red-500" : getStatusColor(skill.status)
                                                        )}>
                                                            {skill.name === "Mistakes Review" ? <AlertCircle className="w-4 h-4" /> : getStatusIcon(skill.status)}
                                                        </div>
                                                        <div>
                                                            <h4 className={cn("font-semibold", skill.name === "Mistakes Review" && "text-red-500")}>{skill.name}</h4>
                                                            <p className="text-xs text-muted-foreground">
                                                                {skill.name === "Mistakes Review"
                                                                    ? `${skill.questionCount} Questions to Review`
                                                                    : `${skill.correctCount} / ${skill.questionCount} Correct`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant={skill.name === "Mistakes Review" ? "destructive" : "ghost"}
                                                        size="sm"
                                                        onClick={() => navigate(`/practice/math/${encodeURIComponent(selectedUnit.id)}/${encodeURIComponent(skill.name)}`)}
                                                    >
                                                        {skill.name === "Mistakes Review" ? "Review" : "Practice"}
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
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
                                            <Button>Start Test</Button>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    No units found.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};

export default MathResources;
