"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Brain,
    Users,
    Target,
    TrendingUp,
    Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TopicStat {
    topic: string;
    total_sessions: number;
    total_questions: number;
    correct_answers: number;
}

interface DifficultyBreakdown {
    easy: number;
    medium: number;
    hard: number;
}

export default function AdminPracticePage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSessions: 0,
        totalQuestionsAnswered: 0,
        averageScore: 0,
        uniqueUsers: 0,
    });
    const [topicStats, setTopicStats] = useState<TopicStat[]>([]);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                // Fetch practice sessions
                const { data: sessions } = await supabase
                    .from('practice_sessions')
                    .select('*');

                const completedSessions = sessions?.filter((s: any) => s.completed_at) || [];
                const totalQuestions = completedSessions.reduce((sum: number, s: any) => sum + (s.total_questions || 0), 0);
                const totalCorrect = completedSessions.reduce((sum: number, s: any) => sum + (s.correct_count || 0), 0);
                const uniqueUserIds = new Set(sessions?.map((s: any) => s.user_id) || []);

                setStats({
                    totalSessions: completedSessions.length,
                    totalQuestionsAnswered: totalQuestions,
                    averageScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
                    uniqueUsers: uniqueUserIds.size,
                });

                // Fetch topic stats from practice_answers
                const { data: answers } = await supabase
                    .from('practice_answers')
                    .select(`
                        is_correct,
                        questions:question_id (
                            topic
                        )
                    `);

                const topicMap: Record<string, { correct: number; total: number }> = {};
                (answers || []).forEach((a: any) => {
                    const topic = a.questions?.topic || 'Other';
                    if (!topicMap[topic]) {
                        topicMap[topic] = { correct: 0, total: 0 };
                    }
                    topicMap[topic].total++;
                    if (a.is_correct) {
                        topicMap[topic].correct++;
                    }
                });

                const topicStatsArray = Object.entries(topicMap)
                    .map(([topic, data]) => ({
                        topic,
                        total_sessions: 0, // Not tracked per topic
                        total_questions: data.total,
                        correct_answers: data.correct,
                    }))
                    .sort((a, b) => b.total_questions - a.total_questions);

                setTopicStats(topicStatsArray);

            } catch (error) {
                console.error('Error fetching practice stats:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    Practice Analytics
                </h1>
                <p className="text-slate-500 mt-1">Monitor practice session statistics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-100 p-3 rounded-lg">
                                <Target className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.totalSessions}</div>
                                <div className="text-sm text-slate-500">Total Sessions</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-lg">
                                <Brain className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.totalQuestionsAnswered}</div>
                                <div className="text-sm text-slate-500">Questions Answered</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-yellow-100 p-3 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.averageScore}%</div>
                                <div className="text-sm text-slate-500">Average Score</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
                                <div className="text-sm text-slate-500">Active Users</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Topic Breakdown */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Performance by Topic</CardTitle>
                </CardHeader>
                <CardContent>
                    {topicStats.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            No practice data yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topicStats.map((stat) => {
                                const percentage = stat.total_questions > 0
                                    ? Math.round((stat.correct_answers / stat.total_questions) * 100)
                                    : 0;

                                return (
                                    <div key={stat.topic} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{stat.topic}</span>
                                            <span className="text-slate-500">
                                                {stat.correct_answers}/{stat.total_questions} correct ({percentage}%)
                                            </span>
                                        </div>
                                        <Progress value={percentage} className="h-2" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
