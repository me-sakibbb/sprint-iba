import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Brain,
    ChevronRight,
    Star,
    Trophy,
    CheckCircle2,
    Circle,
    PlayCircle,
    BookOpen,
    Loader2,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Types for our dynamic data
interface Skill {
    name: string;
    status: "mastered" | "proficient" | "familiar" | "not-started";
    questionCount?: number;
}

interface Unit {
    id: number;
    title: string;
    progress: number;
    skills: Skill[];
}

const AnalyticalResources = () => {
    const [selectedUnitId, setSelectedUnitId] = useState(1);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [courseProgress, setCourseProgress] = useState(0);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchSubtopics = async () => {
            try {
                setLoading(true);

                // 1. Fetch all Analytical questions
                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('id, subtopic, difficulty, puzzle_id')
                    .eq('topic', 'Analytical');

                if (questionsError) throw questionsError;

                // 2. Fetch user progress if logged in
                let userProgressMap = new Map<string, boolean>();
                if (user) {
                    const { data: progressData, error: progressError } = await supabase
                        .from('user_progress')
                        .select('question_id, is_correct')
                        .eq('user_id', user.id);

                    if (!progressError && progressData) {
                        progressData.forEach(p => {
                            if (p.is_correct) userProgressMap.set(p.question_id, true);
                        });
                    }
                }

                if (questionsData) {
                    const subtopicMap = new Map<string, { total: number, correct: number }>();
                    const puzzleMap = new Map<string, { total: number, correct: number }>();
                    const dataSufficiencyMap = new Map<string, { total: number, correct: number }>();
                    const criticalReasoningMap = new Map<string, { total: number, correct: number }>();

                    // Initialize DS map
                    dataSufficiencyMap.set("Basic", { total: 0, correct: 0 });
                    dataSufficiencyMap.set("Intermediate", { total: 0, correct: 0 });
                    dataSufficiencyMap.set("Advanced", { total: 0, correct: 0 });

                    // Initialize CR map
                    criticalReasoningMap.set("Basic", { total: 0, correct: 0 });
                    criticalReasoningMap.set("Intermediate", { total: 0, correct: 0 });
                    criticalReasoningMap.set("Advanced", { total: 0, correct: 0 });

                    let totalQuestions = 0;
                    let totalCorrect = 0;

                    questionsData.forEach(q => {
                        totalQuestions++;
                        const isCorrect = userProgressMap.get(q.id) || false;
                        if (isCorrect) totalCorrect++;

                        if (q.subtopic) {
                            // Data Sufficiency (Unit 3) - Group by Difficulty
                            if (q.subtopic === "Data Sufficiency") {
                                const diff = q.difficulty || "Medium";
                                let skillName = "Intermediate";
                                if (diff === "Easy") skillName = "Basic";
                                else if (diff === "Hard") skillName = "Advanced";

                                const current = dataSufficiencyMap.get(skillName) || { total: 0, correct: 0 };
                                current.total++;
                                if (isCorrect) current.correct++;
                                dataSufficiencyMap.set(skillName, current);
                            }
                            // Critical Reasoning (Unit 4) - Group by Difficulty
                            else if (q.subtopic === "Critical Reasoning") {
                                const diff = q.difficulty || "Medium";
                                let skillName = "Intermediate";
                                if (diff === "Easy") skillName = "Basic";
                                else if (diff === "Hard") skillName = "Advanced";

                                const current = criticalReasoningMap.get(skillName) || { total: 0, correct: 0 };
                                current.total++;
                                if (isCorrect) current.correct++;
                                criticalReasoningMap.set(skillName, current);
                            }
                            // Puzzles (Unit 2) - Group by Subtopic
                            else if (q.puzzle_id) {
                                const category = q.subtopic;
                                const current = puzzleMap.get(category) || { total: 0, correct: 0 };
                                current.total++;
                                if (isCorrect) current.correct++;
                                puzzleMap.set(category, current);
                            }
                            // General Analytical (Unit 1) - Group by Subtopic
                            else {
                                const current = subtopicMap.get(q.subtopic) || { total: 0, correct: 0 };
                                current.total++;
                                if (isCorrect) current.correct++;
                                subtopicMap.set(q.subtopic, current);
                            }
                        }
                    });

                    setCourseProgress(totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);

                    const generalSkills: Skill[] = Array.from(subtopicMap.entries()).map(([name, stats]) => {
                        let status: "not-started" | "familiar" | "proficient" | "mastered" = "not-started";
                        const percentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

                        if (stats.correct > 0) {
                            if (percentage >= 90) status = "mastered";
                            else if (percentage >= 70) status = "proficient";
                            else status = "familiar";
                        }

                        return {
                            name: name,
                            status: status,
                            questionCount: stats.total
                        };
                    }).sort((a, b) => a.name.localeCompare(b.name));

                    const puzzleSkills: Skill[] = Array.from(puzzleMap.entries()).map(([name, stats]) => {
                        let status: "not-started" | "familiar" | "proficient" | "mastered" = "not-started";
                        const percentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

                        if (stats.correct > 0) {
                            if (percentage >= 90) status = "mastered";
                            else if (percentage >= 70) status = "proficient";
                            else status = "familiar";
                        }

                        return {
                            name: name,
                            status: status,
                            questionCount: stats.total
                        };
                    });

                    const newUnits: Unit[] = [];

                    if (generalSkills.length > 0) {
                        newUnits.push({
                            id: 1,
                            title: "Analytical Reasoning",
                            progress: 0,
                            skills: generalSkills
                        });
                    }

                    if (puzzleSkills.length > 0) {
                        newUnits.push({
                            id: 2,
                            title: "Puzzles",
                            progress: 0,
                            skills: puzzleSkills
                        });
                    }

                    // Create Data Sufficiency Skills
                    const dsSkills: Skill[] = ["Basic", "Intermediate", "Advanced"].map(level => {
                        const stats = dataSufficiencyMap.get(level) || { total: 0, correct: 0 };
                        let status: "not-started" | "familiar" | "proficient" | "mastered" = "not-started";
                        const percentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

                        if (stats.correct > 0) {
                            if (percentage >= 90) status = "mastered";
                            else if (percentage >= 70) status = "proficient";
                            else status = "familiar";
                        }

                        return {
                            name: level,
                            status: status,
                            questionCount: stats.total
                        };
                    }).filter(s => s.questionCount > 0);

                    if (dsSkills.some(s => s.questionCount > 0)) {
                        newUnits.push({
                            id: 3,
                            title: "Data Sufficiency",
                            progress: 0,
                            skills: dsSkills
                        });
                    }

                    // Create Critical Reasoning Skills
                    const crSkills: Skill[] = ["Basic", "Intermediate", "Advanced"].map(level => {
                        const stats = criticalReasoningMap.get(level) || { total: 0, correct: 0 };
                        let status: "not-started" | "familiar" | "proficient" | "mastered" = "not-started";
                        const percentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

                        if (stats.correct > 0) {
                            if (percentage >= 90) status = "mastered";
                            else if (percentage >= 70) status = "proficient";
                            else status = "familiar";
                        }

                        return {
                            name: level,
                            status: status,
                            questionCount: stats.total
                        };
                    }).filter(s => s.questionCount > 0);

                    if (crSkills.some(s => s.questionCount > 0)) {
                        newUnits.push({
                            id: 4,
                            title: "Critical Reasoning",
                            progress: 0,
                            skills: crSkills
                        });
                    }

                    if (newUnits.length === 0) {
                        newUnits.push({
                            id: 1,
                            title: "Question Bank",
                            progress: 0,
                            skills: []
                        });
                    }

                    // Check for wrong answers to add "Mistakes Review"
                    let hasWrongAnswers = false;
                    if (user) {
                        // We already have userProgressMap, but we need to know if there are ANY wrong answers for Analytical
                        // We can iterate through questionsData and check if they are in userProgressMap as false?
                        // Actually userProgressMap only stores is_correct=true based on previous logic:
                        // if (p.is_correct) userProgressMap.set(p.question_id, true);

                        // Let's fetch wrong answers specifically or check against a set of attempted questions
                        // A simpler way:
                        const { count } = await supabase
                            .from('user_progress')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                            .eq('is_correct', false)
                            .in('question_id', questionsData.map(q => q.id));

                        if (count && count > 0) {
                            hasWrongAnswers = true;
                        }
                    }

                    setUnits(newUnits);

                    // Add "Mistakes Review" to the first unit (or a dedicated place) if there are wrong answers
                    if (hasWrongAnswers && newUnits.length > 0) {
                        // Add to the first unit for now, or create a special unit?
                        // MathResources added it to the specific unit.
                        // Here we have "Analytical Reasoning" (Unit 1) and "Puzzles" (Unit 2).
                        // Let's add it to Unit 1 for general analytical mistakes.

                        // Actually, let's just add it to the first unit found.
                        newUnits[0].skills.unshift({
                            name: "Mistakes Review",
                            status: "familiar", // Or some other indicator
                            questionCount: 0 // Dynamic
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching subtopics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubtopics();
    }, [user]);

    const selectedUnit = units.find(u => u.id === selectedUnitId) || units[0];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "mastered": return "bg-purple-500 text-white";
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
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                <Brain className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Analytical Mastery</h1>
                                <p className="text-sm text-muted-foreground">
                                    {loading ? "Loading..." : `${units.length} Units Available`}
                                </p>
                            </div>
                        </div>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
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
                                                ? "bg-purple-500/10 text-purple-600 border-l-4 border-purple-500"
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
                                            <span>Analytical</span>
                                            <ChevronRight className="w-4 h-4" />
                                            <span className="text-foreground font-medium">Unit {selectedUnit.id}</span>
                                        </div>
                                        <h2 className="text-3xl font-bold tracking-tight">{selectedUnit.title}</h2>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
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
                                                "border-border/40 hover:border-purple-500/20 transition-colors",
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
                                                            <p className="text-xs text-muted-foreground capitalize">
                                                                {skill.name === "Mistakes Review"
                                                                    ? `${skill.questionCount || 1} Questions to Review`
                                                                    : skill.status.replace("-", " ")
                                                                }
                                                            </p>
                                                            {skill.name !== "Mistakes Review" && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {skill.questionCount} Questions
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant={skill.name === "Mistakes Review" ? "destructive" : "ghost"}
                                                        size="sm"
                                                        onClick={() => navigate(`/practice/analytical/${selectedUnit.id}/${encodeURIComponent(skill.name)}`)}
                                                    >
                                                        {skill.name === "Mistakes Review" ? "Review" : "Practice"}
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Unit Test Card */}
                                    <Card className="bg-gradient-to-br from-purple-500/5 to-accent/5 border-purple-500/20">
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <BookOpen className="w-5 h-5 text-purple-600" />
                                                    Unit Test
                                                </h3>
                                                <p className="text-muted-foreground">Test your knowledge of {selectedUnit.title}</p>
                                            </div>
                                            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Start Test</Button>
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

export default AnalyticalResources;
