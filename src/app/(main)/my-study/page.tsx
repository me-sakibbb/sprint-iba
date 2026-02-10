"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudyTopics, useStudyProgress } from "@/hooks/useStudy";
import { useAuth } from "@/contexts/AuthContext";
import StudyTopicCard from "@/components/study/StudyTopicCard";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    GraduationCap, Search, BookOpen, Target,
    Trophy, Loader2, Sparkles
} from "lucide-react";

export default function MyStudyPage() {
    const { user } = useAuth();
    const { topics, loading: topicsLoading } = useStudyTopics();
    const { progress, loading: progressLoading } = useStudyProgress();
    const [searchQuery, setSearchQuery] = useState("");

    const loading = topicsLoading || progressLoading;

    // Calculate overall stats
    const totalTopics = topics.reduce((count, t) => count + 1 + t.children.length, 0);
    const completedTopics = Object.values(progress).filter(p => p.is_completed).length;
    const overallProgress = totalTopics > 0
        ? Math.round((completedTopics / totalTopics) * 100)
        : 0;
    const totalPracticed = Object.values(progress).reduce((sum, p) => sum + p.practice_attempted, 0);
    const totalCorrect = Object.values(progress).reduce((sum, p) => sum + p.practice_correct, 0);
    const overallAccuracy = totalPracticed > 0
        ? Math.round((totalCorrect / totalPracticed) * 100)
        : 0;

    // Filter topics by search
    const filteredTopics = searchQuery
        ? topics.filter(t =>
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.children.some(c =>
                c.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        : topics;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading your study hub...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Study</h1>
                        <p className="text-muted-foreground">
                            Your personalized learning path
                        </p>
                    </div>
                </div>
            </div>

            {/* Overall Progress Stats */}
            {totalTopics > 0 && (
                <Card className="border-border/40 bg-accent/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold">Overall Progress</h2>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                                {overallProgress}% complete
                            </Badge>
                        </div>

                        <Progress value={overallProgress} className="h-3 mb-6" />

                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 rounded-xl bg-background/50 border border-border/30">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <BookOpen className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div className="text-2xl font-bold">{completedTopics}/{totalTopics}</div>
                                <div className="text-xs text-muted-foreground">Topics Done</div>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-background/50 border border-border/30">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Target className="w-4 h-4 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold">{totalPracticed}</div>
                                <div className="text-xs text-muted-foreground">Questions Practiced</div>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-background/50 border border-border/30">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                </div>
                                <div className="text-2xl font-bold">{overallAccuracy}%</div>
                                <div className="text-xs text-muted-foreground">Accuracy</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Topic List */}
            {filteredTopics.length > 0 ? (
                <div className="space-y-4">
                    {filteredTopics.map((topic) => (
                        <div key={topic.id} className="space-y-3">
                            <StudyTopicCard
                                topic={topic}
                                progress={progress}
                            />
                        </div>
                    ))}
                </div>
            ) : searchQuery ? (
                <div className="text-center py-16">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No topics found</h3>
                    <p className="text-sm text-muted-foreground/70">
                        Try a different search term
                    </p>
                </div>
            ) : (
                <div className="text-center py-16">
                    <GraduationCap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-muted-foreground mb-2">No study topics yet</h3>
                    <p className="text-sm text-muted-foreground/70">
                        Study topics will appear here once they are created and published by an admin.
                    </p>
                </div>
            )}
        </div>
    );
}
