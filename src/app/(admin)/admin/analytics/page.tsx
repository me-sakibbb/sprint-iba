"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, FileText, TrendingUp, Activity } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-emerald-600 p-2 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    Analytics
                </h1>
                <p className="text-slate-500 mt-1">Platform usage analytics and insights</p>
            </div>

            {/* Placeholder */}
            <Card className="border-slate-200">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-bold">Analytics Coming Soon</h3>
                    <p className="text-slate-500 text-sm max-w-md mt-2">
                        Detailed analytics and insights will be available here. Track user engagement,
                        question performance, and platform growth metrics.
                    </p>
                </CardContent>
            </Card>

            {/* Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-sm text-slate-500 font-medium">Daily Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-slate-900">--</p>
                        <p className="text-sm text-slate-400 mt-1">Data coming soon</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-sm text-slate-500 font-medium">Questions Attempted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-slate-900">--</p>
                        <p className="text-sm text-slate-400 mt-1">Data coming soon</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-sm text-slate-500 font-medium">Avg. Session Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-slate-900">--</p>
                        <p className="text-sm text-slate-400 mt-1">Data coming soon</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
