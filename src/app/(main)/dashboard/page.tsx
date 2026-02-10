"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Zap, BookOpen, Sparkles, ClipboardList, FileText, Brain } from "lucide-react";
import { useRouter } from "next/navigation";
import DailyGoals from "@/components/DailyGoals";
import SubjectMastery from "@/components/SubjectMastery";
import TrackProgress from "@/components/progression/TrackProgress";
import LevelUpAnimation from "@/components/progression/LevelUpAnimation";
import LevelBadge from "@/components/badges/LevelBadge";
import { useVelocityPoints } from "@/hooks/useVelocityPoints";
import { formatVPFull } from "@/utils/vpCalculations";
import DashboardWidgets from "@/components/dashboard/DashboardWidgets";

const Dashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);
    const {
        totalVp,
        currentLevel,
        loading: loadingVP,
        showLevelUpAnimation,
        levelUpData,
        closeLevelUpAnimation,
    } = useVelocityPoints();

    return (
        <div className="container mx-auto px-6 py-8">
            {/* Welcome Section */}
            <div className="mb-8 animate-fade-in">
                <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {user?.user_metadata?.full_name || "Student"}!
                </h1>
                <p className="text-muted-foreground">Ready to sprint towards your IBA goals?</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Practice Mode */}
                    <Card
                        className="h-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent cursor-pointer group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col"
                        onClick={() => router.push("/practice")}
                    >
                        <CardHeader className="pb-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-md shrink-0">
                                    <ClipboardList className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Practice Mode</CardTitle>
                                    <CardDescription className="line-clamp-2">Master topics at your pace</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                            <Button className="w-full h-9 text-sm btn-hover-glow gradient-primary group-hover:scale-[1.02] transition-transform">
                                Start Practice
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Exams */}
                    <Card
                        className="h-full border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent cursor-pointer group hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/5 flex flex-col"
                        onClick={() => router.push("/exams")}
                    >
                        <CardHeader className="pb-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shadow-md shrink-0">
                                    <FileText className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Exams</CardTitle>
                                    <CardDescription className="line-clamp-2">Mock tests & live exams</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                            <Button className="w-full h-9 text-sm btn-hover-glow gradient-accent group-hover:scale-[1.02] transition-transform">
                                View Exams
                            </Button>
                        </CardContent>
                    </Card>

                    {/* VocabPoly */}
                    <Card
                        className="h-full border-border/40 cursor-pointer group hover:border-primary/30 transition-all hover:shadow-md flex flex-col"
                        onClick={() => router.push("/vocabpoly")}
                    >
                        <CardHeader className="pb-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">VocabPoly</CardTitle>
                                    <CardDescription className="line-clamp-2">Gamified vocabulary</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                            <Button variant="outline" className="w-full h-9 text-sm group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/30">
                                Play Now
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Vocab Sprint */}
                    <Card className="h-full border-border/40 cursor-pointer group hover:border-primary/30 transition-all hover:shadow-md flex flex-col">
                        <CardHeader className="pb-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Vocab Sprint</CardTitle>
                                    <CardDescription className="line-clamp-2">Test your word power</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                            <Button variant="outline" className="w-full h-9 text-sm group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/30">
                                Start Sprint
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Math Sprint */}
                    <Card className="h-full border-border/40 cursor-pointer group hover:border-primary/30 transition-all hover:shadow-md flex flex-col">
                        <CardHeader className="pb-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Math Sprint</CardTitle>
                                    <CardDescription className="line-clamp-2">Sharpen math skills</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                            <Button variant="outline" className="w-full h-9 text-sm group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/30">
                                Start Sprint
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Daily Goals & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <div className="lg:col-span-2 h-full">
                    <DailyGoals className="h-full" />
                </div>

                {/* Track Progress - Moved to sidebar */}
                <div className="space-y-6 h-full">
                    {!loadingVP && (
                        <TrackProgress totalVp={totalVp} currentLevel={currentLevel} className="h-full" />
                    )}
                </div>
            </div>

            {/* Dashboard Widgets (Study Progress, Tasks, Activity) - Full Width */}
            <div className="mb-12">
                <DashboardWidgets />
            </div>

            {/* Subject Mastery */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <h2 className="text-xl font-bold mb-6">Subject Mastery</h2>
                <SubjectMastery />
            </div>

            {/* Level Up Animation */}
            {showLevelUpAnimation && levelUpData && (
                <LevelUpAnimation
                    level={levelUpData}
                    open={showLevelUpAnimation}
                    onClose={closeLevelUpAnimation}
                />
            )}
        </div>
    );
};

export default Dashboard;
