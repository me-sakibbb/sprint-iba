"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    ChevronRight, ChevronDown, Circle, CheckCircle,
    BookOpen, Layers, Target, FileText, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StudyTopicWithChildren } from "@/hooks/useStudy";

interface StudyTopicSidebarProps {
    topics: StudyTopicWithChildren[];
    currentSubtopicId: string | null;
    onSelectSubtopic: (subtopic: StudyTopicWithChildren) => void;
    progress: Record<string, any>;
    className?: string;
}

export default function StudyTopicSidebar({
    topics,
    currentSubtopicId,
    onSelectSubtopic,
    progress,
    className
}: StudyTopicSidebarProps) {
    // Determine which topics should be expanded
    // Expanding logic:
    // 1. If currently selected subtopic exists, expand its parent topic
    // 2. Otherwise allow manual toggling

    // We'll store expanded topic IDs
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

    // Auto-expand parent of current subtopic on mount/change
    useEffect(() => {
        if (currentSubtopicId) {
            const parent = topics.find(t => t.children.some(c => c.id === currentSubtopicId));
            if (parent) {
                setExpandedTopics(prev => {
                    const next = new Set(prev);
                    next.add(parent.id);
                    return next;
                });
            }
        } else if (topics.length > 0) {
            // Optional: Auto expand first topic if nothing selected
            setExpandedTopics(prev => {
                const next = new Set(prev);
                next.add(topics[0].id);
                return next;
            });
        }
    }, [currentSubtopicId, topics]);

    const toggleTopic = (topicId: string) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };

    return (
        <div className={cn("w-full bg-background h-[calc(100vh-6rem)] overflow-y-auto", className)}>
            <div className="p-4 border-b">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    Table of Contents
                </h2>
            </div>

            <div className="py-2">
                {topics.map((topic, index) => {
                    const isExpanded = expandedTopics.has(topic.id);
                    const topicProgress = progress[topic.id];
                    const isCompleted = topicProgress?.is_completed;

                    // Calculate subtopic completion
                    const completedSubtopics = topic.children.filter(sub =>
                        progress[sub.id]?.is_completed
                    ).length;
                    const totalSubtopics = topic.children.length;
                    const percentComplete = totalSubtopics > 0
                        ? (completedSubtopics / totalSubtopics) * 100
                        : 0;

                    return (
                        <div key={topic.id} className="mb-1">
                            {/* Topic Header */}
                            <button
                                onClick={() => toggleTopic(topic.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors group",
                                    isExpanded && "bg-accent/30"
                                )}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "w-5 h-5 flex items-center justify-center rounded text-xs font-bold shrink-0",
                                        isCompleted ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
                                    </div>
                                    <span className="font-medium truncate text-sm">
                                        {topic.title}
                                    </span>
                                </div>
                                <ChevronRight
                                    className={cn(
                                        "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                                        isExpanded && "rotate-90"
                                    )}
                                />
                            </button>

                            {/* Subtopic List */}
                            {isExpanded && (
                                <div className="bg-accent/20 border-y border-border/40">
                                    {topic.children.length > 0 ? (
                                        topic.children.map((subtopic, subIndex) => {
                                            const isActive = subtopic.id === currentSubtopicId;
                                            const subProgress = progress[subtopic.id];
                                            const isSubCompleted = subProgress?.is_completed;

                                            return (
                                                <button
                                                    key={subtopic.id}
                                                    onClick={() => onSelectSubtopic(subtopic)}
                                                    className={cn(
                                                        "w-full flex items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors border-l-2",
                                                        isActive
                                                            ? "bg-primary/5 border-primary text-primary font-medium"
                                                            : "border-transparent hover:bg-accent/50 text-muted-foreground hover:text-foreground pl-[18px]"
                                                    )}
                                                    style={{ paddingLeft: isActive ? '16px' : '18px' }}
                                                >
                                                    <div className="mt-0.5 shrink-0">
                                                        {isSubCompleted ? (
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                        ) : (
                                                            <div className={cn(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                isActive ? "bg-primary" : "bg-border"
                                                            )} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="truncate block">
                                                            {subtopic.title}
                                                        </span>
                                                        {/* Optional: Show badges for practice availability */}
                                                        {(subtopic.materials_count > 0 || subtopic.question_count > 0) && (
                                                            <div className="flex items-center gap-2 mt-1 opacity-70">
                                                                {subtopic.materials_count > 0 && (
                                                                    <div className="flex items-center gap-1 text-[10px]">
                                                                        <FileText className="w-3 h-3" />
                                                                        {subtopic.materials_count}
                                                                    </div>
                                                                )}
                                                                {subtopic.question_count > 0 && (
                                                                    <div className="flex items-center gap-1 text-[10px]">
                                                                        <Target className="w-3 h-3" />
                                                                        {subtopic.question_count}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="px-10 py-3 text-xs text-muted-foreground italic">
                                            No subtopics available
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
