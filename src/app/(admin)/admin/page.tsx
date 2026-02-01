"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    FileText,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    BrainCircuit,
    BookOpen,
    Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
    totalUsers: number;
    totalQuestions: number;
    activeToday: number;
    newUsersThisWeek: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        totalQuestions: 0,
        activeToday: 0,
        newUsersThisWeek: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch user count
                const { count: userCount } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true });

                // Fetch question count
                const { count: questionCount } = await supabase
                    .from("questions")
                    .select("*", { count: "exact", head: true });

                setStats({
                    totalUsers: userCount || 0,
                    totalQuestions: questionCount || 0,
                    activeToday: Math.floor(Math.random() * 50) + 10, // Placeholder
                    newUsersThisWeek: Math.floor(Math.random() * 20) + 5 // Placeholder
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            change: "+12%",
            positive: true,
            color: "bg-blue-500"
        },
        {
            title: "Questions Bank",
            value: stats.totalQuestions,
            icon: BrainCircuit,
            change: "+24%",
            positive: true,
            color: "bg-indigo-500"
        },
        {
            title: "Active Today",
            value: stats.activeToday,
            icon: Activity,
            change: "+8%",
            positive: true,
            color: "bg-emerald-500"
        },
        {
            title: "New This Week",
            value: stats.newUsersThisWeek,
            icon: TrendingUp,
            change: "-3%",
            positive: false,
            color: "bg-amber-500"
        }
    ];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">Overview of your platform metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Card key={stat.title} className="border-slate-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">
                                        {loading ? "..." : stat.value.toLocaleString()}
                                    </p>
                                    <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${stat.positive ? "text-emerald-600" : "text-red-600"}`}>
                                        {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {stat.change}
                                        <span className="text-slate-400 font-normal">vs last week</span>
                                    </div>
                                </div>
                                <div className={`${stat.color} p-3 rounded-xl`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <a
                            href="/admin/questions"
                            className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors group"
                        >
                            <div className="bg-indigo-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                                <BrainCircuit className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Extract Questions from PDF</h3>
                                <p className="text-sm text-slate-500">Upload PDFs and extract MCQs using AI</p>
                            </div>
                        </a>
                        <a
                            href="/admin/users"
                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                        >
                            <div className="bg-slate-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Manage Users</h3>
                                <p className="text-sm text-slate-500">View and manage user accounts</p>
                            </div>
                        </a>
                        <a
                            href="/admin/taxonomy"
                            className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
                        >
                            <div className="bg-blue-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Taxonomy Management</h3>
                                <p className="text-sm text-slate-500">Manage Subjects, Topics, and Subtopics</p>
                            </div>
                        </a>
                        <a
                            href="/admin/practice"
                            className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                        >
                            <div className="bg-emerald-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Practice Analytics</h3>
                                <p className="text-sm text-slate-500">Monitor practice session statistics</p>
                            </div>
                        </a>
                        <a
                            href="/admin/exams"
                            className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors group"
                        >
                            <div className="bg-amber-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Manage Exams</h3>
                                <p className="text-sm text-slate-500">Create and manage mock & live exams</p>
                            </div>
                        </a>
                        <a
                            href="/admin/point-config"
                            className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group"
                        >
                            <div className="bg-purple-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Points Configuration</h3>
                                <p className="text-sm text-slate-500">Configure VP values and streaks</p>
                            </div>
                        </a>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-slate-600">New user registered</span>
                                    <span className="text-slate-400 ml-auto">{i + 1}h ago</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
