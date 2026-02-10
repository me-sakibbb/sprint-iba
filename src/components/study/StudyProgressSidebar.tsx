"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    BookOpen, Target, CheckCircle2, Trophy, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type StudyUserProgress = Tables<'study_user_progress'>;

interface StudyProgressSidebarProps {
    progress: StudyUserProgress | undefined;
    totalMaterials: number;
    topicColor: string;
    onMarkComplete: () => void;
}

export default function StudyProgressSidebar({
    progress,
    totalMaterials,
    topicColor,
    onMarkComplete,
}: StudyProgressSidebarProps) {
    const materialsRead = progress?.materials_read?.length || 0;
    const practiceAttempted = progress?.practice_attempted || 0;
    const practiceCorrect = progress?.practice_correct || 0;
    const isCompleted = progress?.is_completed || false;

    const materialProgress = totalMaterials > 0
        ? Math.round((materialsRead / totalMaterials) * 100)
        : 0;
    const practiceAccuracy = practiceAttempted > 0
        ? Math.round((practiceCorrect / practiceAttempted) * 100)
        : 0;

    return (
        <div className="space-y-4">
            {/* Overall Status */}
            <Card className={cn(
                "border-border/40 overflow-hidden",
                isCompleted && "border-green-500/30"
            )}>
                <div className="h-1" style={{ backgroundColor: topicColor }} />
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5" style={{ color: topicColor }} />
                        <h3 className="font-semibold text-sm">Your Progress</h3>
                    </div>

                    {isCompleted && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Topic Completed!</span>
                        </div>
                    )}

                    {/* Materials Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <BookOpen className="w-3.5 h-3.5" />
                                Materials
                            </span>
                            <span className="font-medium">
                                {materialsRead}/{totalMaterials}
                            </span>
                        </div>
                        <Progress value={materialProgress} className="h-2" />
                    </div>

                    {/* Practice Stats */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Target className="w-3.5 h-3.5" />
                                Practice
                            </span>
                            <span className="font-medium">
                                {practiceAttempted > 0
                                    ? `${practiceCorrect}/${practiceAttempted} (${practiceAccuracy}%)`
                                    : "Not started"
                                }
                            </span>
                        </div>
                        {practiceAttempted > 0 && (
                            <Progress
                                value={practiceAccuracy}
                                className={cn(
                                    "h-2",
                                    practiceAccuracy >= 80 && "[&>div]:bg-green-500",
                                    practiceAccuracy >= 50 && practiceAccuracy < 80 && "[&>div]:bg-yellow-500",
                                    practiceAccuracy < 50 && "[&>div]:bg-red-500"
                                )}
                            />
                        )}
                    </div>

                    {/* Last Accessed */}
                    {progress?.last_accessed_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                            <Clock className="w-3 h-3" />
                            Last studied: {new Date(progress.last_accessed_at).toLocaleDateString()}
                        </div>
                    )}

                    {/* Mark Complete */}
                    {!isCompleted && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-green-600 border-green-500/30 hover:bg-green-500/10"
                            onClick={onMarkComplete}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Complete
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
