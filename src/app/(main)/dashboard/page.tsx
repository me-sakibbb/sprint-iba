"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
            <div className="mb-12 animate-fade-in">
                <h1 className="text-4xl font-bold mb-2">
                    Welcome back, {user?.user_metadata?.full_name || "Student"}!
                </h1>
                <p className="text-muted-foreground text-lg">Ready to sprint towards your IBA goals?</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {/* Current Level Card */}
                <Card className="border-border/40 card-hover-glow">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Current Level</CardTitle>
                            <Trophy className="w-5 h-5 text-accent" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingVP ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-full skeleton" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-6 w-32 skeleton" />
                                        <div className="h-4 w-24 skeleton" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <LevelBadge level={currentLevel} size="md" />
                                <div>
                                    <p className="text-xl font-bold gradient-text">{currentLevel.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{currentLevel.track.replace(/_/g, ' ')}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Velocity Points Card */}
                <Card className="border-border/40 card-hover-glow">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Velocity Points</CardTitle>
                            <img src="/assets/velocity-coin.png" alt="VP" className="w-5 h-5 object-contain" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingVP ? (
                            <div className="space-y-2">
                                <div className="h-10 w-40 skeleton" />
                                <div className="h-4 w-28 skeleton" />
                            </div>
                        ) : (
                            <>
                                <p className="text-3xl font-bold gradient-text">
                                    {formatVPFull(totalVp)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Total VP earned</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Study Streak Card */}
                <Card className="border-border/40 card-hover-glow">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Study Streak</CardTitle>
                            <Zap className="w-5 h-5 text-accent" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold gradient-text">7 Days</p>
                        <p className="text-sm text-muted-foreground mt-1">+500 VP per day!</p>
                    </CardContent>
                </Card>
            </div>

            {/* Track Progress Section */}
            <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                {!loadingVP && (
                    <TrackProgress totalVp={totalVp} currentLevel={currentLevel} />
                )}
            </div>

            {/* Dashboard Widgets */}
            <DashboardWidgets />

            {/* Featured: Practice & Exams */}
            <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-accent" />
                    Featured
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card
                        className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 cursor-pointer group hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10"
                        onClick={() => router.push("/practice")}
                    >
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                                    <ClipboardList className="w-7 h-7 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Practice Mode</CardTitle>
                                    <CardDescription className="text-base">Master topics at your own pace</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Math</span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">English</span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Analytical</span>
                            </div>
                            <Button className="w-full btn-hover-glow gradient-primary group-hover:scale-[1.02] transition-transform">
                                <Brain className="w-5 h-5 mr-2" />
                                Start Practice
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 cursor-pointer group hover:border-accent/50 transition-all hover:shadow-xl hover:shadow-accent/10"
                        onClick={() => router.push("/exams")}
                    >
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center shadow-lg">
                                    <FileText className="w-7 h-7 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Exams</CardTitle>
                                    <CardDescription className="text-base">Mock tests & live competitions</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">Mock Exams</span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">Live Exams</span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">Leaderboard</span>
                            </div>
                            <Button className="w-full btn-hover-glow gradient-accent group-hover:scale-[1.02] transition-transform">
                                <Trophy className="w-5 h-5 mr-2" />
                                View Exams
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-border/40 card-hover-glow cursor-pointer group" onClick={() => router.push("/vocabpoly")}>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle>VocabPoly</CardTitle>
                                    <CardDescription>Master vocabulary through engaging challenges</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full btn-hover-glow gradient-primary">
                                Start Game
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 card-hover-glow cursor-pointer group">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle>Vocab Sprint</CardTitle>
                                    <CardDescription>Test your vocabulary skills</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full btn-hover-glow gradient-primary">
                                Start Sprint
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 card-hover-glow cursor-pointer group">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                                    <Target className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <CardTitle>Math Sprint</CardTitle>
                                    <CardDescription>Sharpen your math abilities</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full btn-hover-glow gradient-primary">
                                Start Sprint
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Daily Goals */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <DailyGoals />
            </div>

            {/* Subject Mastery */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                <h2 className="text-2xl font-bold mb-6 mt-12">Subject Mastery</h2>
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
