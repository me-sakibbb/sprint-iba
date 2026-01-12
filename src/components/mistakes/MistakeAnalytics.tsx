"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, Target, BookOpen, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useMistakes, type MistakeAnalytics, type AIFeedback } from "@/hooks/useMistakes";
import { toast } from "sonner";

interface MistakeAnalyticsProps {
    analytics: MistakeAnalytics | null;
    loading?: boolean;
}

export default function MistakeAnalyticsPanel({ analytics, loading }: MistakeAnalyticsProps) {
    const { requestAIFeedback } = useMistakes();
    const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const handleAnalyzeMistakes = async () => {
        if (!analytics || analytics.totalMistakes === 0) {
            toast.error("You need to make some mistakes first!");
            return;
        }

        setAiLoading(true);
        try {
            const feedback = await requestAIFeedback('overall');
            setAiFeedback(feedback);
            toast.success("AI Analysis complete!");
        } catch (error) {
            console.error("Failed to analyze mistakes:", error);
            toast.error("Failed to generate insights. Please try again.");
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-border/40">
                <CardContent className="p-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-8 bg-muted rounded w-1/2"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!analytics) return null;

    const topTopics = Object.entries(analytics.mistakesByTopic)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const trendDirection = () => {
        if (analytics.recentTrend.length < 2) return 'stable';
        const recent = analytics.recentTrend.slice(-3);
        const avg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
        const older = analytics.recentTrend.slice(0, -3);
        const oldAvg = older.length > 0 ? older.reduce((sum, d) => sum + d.count, 0) / older.length : avg;

        if (avg < oldAvg * 0.8) return 'improving';
        if (avg > oldAvg * 1.2) return 'worsening';
        return 'stable';
    };

    const trend = trendDirection();

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Mistakes */}
                <Card className="border-border/40">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Total Mistakes
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {analytics.totalMistakes}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* High Priority */}
                <Card className="border-border/40">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            High Priority
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-orange-500">
                            {analytics.highPriorityCount}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Trend */}
                <Card className="border-border/40">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            {trend === 'improving' ? (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                            ) : trend === 'worsening' ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                            ) : (
                                <Target className="w-4 h-4" />
                            )}
                            7-Day Trend
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold">
                            {trend === 'improving' ? (
                                <span className="text-green-500">Improving</span>
                            ) : trend === 'worsening' ? (
                                <span className="text-red-500">Needs Focus</span>
                            ) : (
                                <span className="text-muted-foreground">Stable</span>
                            )}
                        </CardTitle>
                    </CardHeader>
                </Card>

                {/* Most Problematic Topic */}
                <Card className="border-border/40">
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Top Problem Area
                        </CardDescription>
                        <CardTitle className="text-xl font-bold truncate" title={topTopics[0]?.[0] || 'None'}>
                            {topTopics[0]?.[0] || 'None'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* AI Analysis Section */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <CardTitle>AI Mistake Analysis</CardTitle>
                        </div>
                        {!aiFeedback && (
                            <Button
                                onClick={handleAnalyzeMistakes}
                                disabled={aiLoading || analytics.totalMistakes === 0}
                                className="gradient-primary"
                            >
                                {aiLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Analyze My Mistakes
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <CardDescription>
                        Get personalized insights and an action plan to improve your weak areas.
                    </CardDescription>
                </CardHeader>
                {aiFeedback && (
                    <CardContent className="space-y-6 animate-fade-in">
                        <div className="p-4 rounded-lg bg-background border border-border/50">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                Feedback
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">
                                {aiFeedback.feedback_text}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                    Root Causes
                                </h4>
                                <ul className="space-y-2">
                                    {aiFeedback.root_causes?.split('\n').map((cause, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                            {cause.replace(/^[•-]\s*/, '')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                    Action Plan
                                </h4>
                                <ul className="space-y-2">
                                    {aiFeedback.action_plan?.split('\n').map((step, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                            {step.replace(/^\d+\.\s*/, '')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {aiFeedback.practice_focus && (
                            <div className="pt-4 border-t border-border/50">
                                <h4 className="font-semibold mb-2 text-sm">Recommended Practice Focus:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {aiFeedback.practice_focus.split(',').map((topic, i) => (
                                        <Badge key={i} variant="secondary" className="px-3 py-1">
                                            {topic.trim()}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleAnalyzeMistakes}
                                disabled={aiLoading}
                                className="text-xs text-muted-foreground"
                            >
                                {aiLoading ? 'Refreshing...' : 'Refresh Analysis'}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
