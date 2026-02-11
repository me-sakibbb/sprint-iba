"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Clock, TrendingUp } from "lucide-react";

interface QuickStatsProps {
    questionsAnswered?: number;
    studyTime?: string;
    accuracy?: number;
    weeklyProgress?: number;
}

export default function QuickStats({
    questionsAnswered = 247,
    studyTime = "12h 35m",
    accuracy = 87,
    weeklyProgress = 15
}: QuickStatsProps) {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Study Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{questionsAnswered}</p>
                            <p className="text-xs text-muted-foreground">Questions Answered</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{studyTime}</p>
                            <p className="text-xs text-muted-foreground">Study Time</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Target className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{accuracy}%</p>
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">+{weeklyProgress}%</p>
                            <p className="text-xs text-muted-foreground">This Week</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
