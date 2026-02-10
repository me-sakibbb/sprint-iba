"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen, Calculator, Languages, Brain, Lightbulb, Code,
    Beaker, Globe, Music, Palette, PenTool, Trophy,
    ChevronRight, CheckCircle2, GraduationCap, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { StudyTopicWithChildren, StudyProgressMap } from "@/hooks/useStudy";

// Lucide icon mapper
const iconMap: Record<string, any> = {
    BookOpen, Calculator, Languages, Brain, Lightbulb, Code,
    Beaker, Globe, Music, Palette, PenTool, Trophy, GraduationCap, Layers,
};

interface StudyTopicCardProps {
    topic: StudyTopicWithChildren;
    progress?: StudyProgressMap;
    totalMaterials?: number;
}

export default function StudyTopicCard({ topic, progress, totalMaterials }: StudyTopicCardProps) {
    const router = useRouter();
    const IconComponent = iconMap[topic.icon_name || 'BookOpen'] || BookOpen;

    const topicProgress = progress?.[topic.id];
    const materialsRead = topicProgress?.materials_read?.length || 0;
    const totalMats = totalMaterials || topic.materials_count || 0;
    const practiceAttempted = topicProgress?.practice_attempted || 0;
    const practiceCorrect = topicProgress?.practice_correct || 0;
    const isCompleted = topicProgress?.is_completed || false;

    // Calculate overall progress percentage
    const materialProgress = totalMats > 0 ? (materialsRead / totalMats) * 100 : 0;
    const practiceAccuracy = practiceAttempted > 0 ? (practiceCorrect / practiceAttempted) * 100 : 0;
    const overallProgress = totalMats > 0
        ? Math.round((materialProgress * 0.6 + Math.min(practiceAccuracy, 100) * 0.4))
        : (practiceAttempted > 0 ? Math.round(practiceAccuracy) : 0);

    return (
        <Card
            className={cn(
                "group cursor-pointer border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden",
                isCompleted && "border-green-500/30 bg-green-500/5"
            )}
            onClick={() => router.push(`/my-study/${topic.slug}`)}
        >
            <CardContent className="p-0">
                <div className="flex items-stretch">
                    {/* Color accent bar - kept as solid color identifier */}
                    <div
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: topic.color || '#6366f1' }}
                    />

                    <div className="flex-1 p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                                className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{
                                    backgroundColor: `${topic.color || '#6366f1'}10`,
                                    color: topic.color || '#6366f1',
                                }}
                            >
                                <IconComponent className="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-foreground truncate mb-1">
                                    {topic.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    {topic.children.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 opacity-70" />
                                            <span>{topic.children.length} topics</span>
                                        </div>
                                    )}
                                    {totalMats > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4 opacity-70" />
                                            <span>{materialsRead}/{totalMats} completed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right side: Progress + Arrow */}
                        <div className="flex items-center gap-6 shrink-0">
                            {overallProgress > 0 && (
                                <div className="text-right hidden sm:block">
                                    <div className="text-xl font-bold" style={{ color: topic.color || '#6366f1' }}>
                                        {overallProgress}%
                                    </div>
                                </div>
                            )}
                            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Bottom Progress bar - only if started */}
                {overallProgress > 0 && (
                    <Progress value={overallProgress} className="h-1 rounded-none bg-transparent" />
                )}
            </CardContent>
        </Card>
    );
}
