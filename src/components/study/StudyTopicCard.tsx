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

    const themeColor = topic.color || '#6366f1';

    return (
        <Card
            className={cn(
                "group cursor-pointer border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden h-full flex flex-col",
                isCompleted && "border-green-500/30 bg-green-500/5"
            )}
            onClick={() => router.push(`/my-study/${topic.slug}`)}
        >
            {/* Top Color Line */}
            <div className="h-1.5 w-full" style={{ backgroundColor: themeColor }} />

            <CardContent className="p-6 flex flex-col flex-1 gap-4">
                {/* Header: Icon & Title */}
                <div className="flex items-start justify-between gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
                        style={{
                            backgroundColor: `${themeColor}15`, // 15 = roughly 8-10% opacity hex
                            color: themeColor,
                        }}
                    >
                        <IconComponent className="w-7 h-7" />
                    </div>
                    {overallProgress > 0 && (
                        <Badge variant="secondary" className="font-bold">
                            {overallProgress}%
                        </Badge>
                    )}
                </div>

                <div className="space-y-2 flex-1">
                    <h3 className="font-bold text-xl text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {topic.title}
                    </h3>
                    {topic.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {topic.description}
                        </p>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-secondary/30 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
                        <Layers className="w-4 h-4 text-muted-foreground mb-1" />
                        <span className="text-lg font-semibold leading-none">{topic.children.length}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Topics</span>
                    </div>

                    <div className="bg-secondary/30 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
                        <BookOpen className="w-4 h-4 text-muted-foreground mb-1" />
                        <span className="text-lg font-semibold leading-none">
                            {totalMats > 0 ? `${materialsRead}/${totalMats}` : '-'}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Lessons</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>Progress</span>
                        <span>{overallProgress}%</span>
                    </div>
                    <Progress
                        value={overallProgress}
                        className="h-2"
                        indicatorColor={themeColor}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
