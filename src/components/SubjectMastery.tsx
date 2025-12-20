import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Brain, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SubjectMastery = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [strongTopics, setStrongTopics] = useState<string[]>([]);
    const [weakTopics, setWeakTopics] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                setLoading(true);

                // Fetch user progress joined with questions to get topic/subtopic
                const { data, error } = await supabase
                    .from('user_progress')
                    .select(`
                        is_correct,
                        questions (
                            topic,
                            subtopic
                        )
                    `)
                    .eq('user_id', user.id);

                if (error) throw error;

                if (data) {
                    // Aggregation structures
                    const topicStats: Record<string, { total: number, correct: number }> = {
                        "Math": { total: 0, correct: 0 },
                        "English": { total: 0, correct: 0 },
                        "Analytical": { total: 0, correct: 0 }
                    };

                    const subtopicStats: Record<string, { total: number, correct: number }> = {};

                    data.forEach((item: any) => {
                        const q = item.questions;
                        if (!q) return;

                        const topic = q.topic;
                        const subtopic = q.subtopic;
                        const isCorrect = item.is_correct;

                        // Topic Aggregation
                        if (topicStats[topic]) {
                            topicStats[topic].total++;
                            if (isCorrect) topicStats[topic].correct++;
                        }

                        // Subtopic Aggregation
                        if (subtopic) {
                            if (!subtopicStats[subtopic]) {
                                subtopicStats[subtopic] = { total: 0, correct: 0 };
                            }
                            subtopicStats[subtopic].total++;
                            if (isCorrect) subtopicStats[subtopic].correct++;
                        }
                    });

                    // Prepare Chart Data
                    const newChartData = [
                        {
                            subject: "Math",
                            A: topicStats["Math"].total > 0 ? Math.round((topicStats["Math"].correct / topicStats["Math"].total) * 100) : 0,
                            fullMark: 100
                        },
                        {
                            subject: "English",
                            A: topicStats["English"].total > 0 ? Math.round((topicStats["English"].correct / topicStats["English"].total) * 100) : 0,
                            fullMark: 100
                        },
                        {
                            subject: "Analytical",
                            A: topicStats["Analytical"].total > 0 ? Math.round((topicStats["Analytical"].correct / topicStats["Analytical"].total) * 100) : 0,
                            fullMark: 100
                        },
                    ];
                    setChartData(newChartData);

                    // Prepare Strong/Weak Topics
                    const subtopicArray = Object.entries(subtopicStats).map(([name, stats]) => ({
                        name,
                        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
                        total: stats.total
                    }));

                    // Sort by percentage desc
                    subtopicArray.sort((a, b) => b.percentage - a.percentage);

                    // Filter for meaningful data (at least a few attempts?) - for now just raw sort
                    // Strong: Top 3
                    const strong = subtopicArray.filter(s => s.percentage >= 70).slice(0, 5).map(s => s.name);
                    // Weak: Bottom 3 (but must have been attempted)
                    const weak = subtopicArray.filter(s => s.percentage < 70).reverse().slice(0, 5).map(s => s.name);

                    // Fallback if no data
                    setStrongTopics(strong.length > 0 ? strong : ["Keep practicing to see strong topics!"]);
                    setWeakTopics(weak.length > 0 ? weak : ["Keep practicing to identify weak areas!"]);
                }

            } catch (error) {
                console.error("Error fetching mastery data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress Charts */}
            <Card className="border-border/40">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-accent" />
                        <CardTitle>Subject Mastery</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Mastery"
                                    dataKey="A"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.5}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                        borderRadius: "var(--radius)"
                                    }}
                                    itemStyle={{ color: "hsl(var(--foreground))" }}
                                    formatter={(value: number) => [`${value}%`, "Mastery"]}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Topic Analysis */}
            <Card className="border-border/40">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        <CardTitle>Topic Analysis</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-500">
                            <TrendingUp className="w-4 h-4" />
                            Strong Topics
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {strongTopics.map((topic, i) => (
                                <div key={i} className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm font-medium border border-green-500/20">
                                    {topic}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-orange-500">
                            <AlertCircle className="w-4 h-4" />
                            Needs Improvement
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {weakTopics.map((topic, i) => (
                                <div key={i} className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-sm font-medium border border-orange-500/20">
                                    {topic}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SubjectMastery;
