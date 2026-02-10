"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";




import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import DailyGoals from "@/components/DailyGoals";
import SubjectMastery from "@/components/SubjectMastery";
import TrackProgress from "@/components/progression/TrackProgress";
import LevelUpAnimation from "@/components/progression/LevelUpAnimation";

import { useVelocityPoints } from "@/hooks/useVelocityPoints";

import DashboardWidgets from "@/components/dashboard/DashboardWidgets";
import QuickActions from "@/components/dashboard/QuickActions";

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
                <QuickActions />
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
