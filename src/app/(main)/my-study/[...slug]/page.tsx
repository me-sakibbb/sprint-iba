"use client";

import { useState, use, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudyTopic, useStudyProgress, useStudyTopics } from "@/hooks/useStudy";
import StudyMaterialViewer from "@/components/study/StudyMaterialViewer";
import StudyPractice from "@/components/study/StudyPractice";
import StudyProgressSidebar from "@/components/study/StudyProgressSidebar"; // Not used but kept for error prevention until removed
import StudyTopicSidebar from "@/components/study/StudyTopicSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft, BookOpen, FileText, Target, Loader2, Layers,
    ChevronRight, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icon mapper (same as StudyTopicCard)
import {
    Calculator, Languages, Brain, Lightbulb, Code,
    Beaker, Globe, Music, Palette, PenTool, Trophy, GraduationCap
} from "lucide-react";

const iconMap: Record<string, any> = {
    BookOpen, Calculator, Languages, Brain, Lightbulb, Code,
    Beaker, Globe, Music, Palette, PenTool, Trophy, GraduationCap, Layers,
};

export default function StudyTopicPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const slug = Array.isArray(unwrappedParams.slug) ? unwrappedParams.slug.join('-') : unwrappedParams.slug;

    // 1. Fetch full hierarchy to build sidebar
    const { topics: allSubjects, loading: structureLoading } = useStudyTopics();

    // 2. Fetch specific content for current slug
    // We only fetch content if we identify this is a valid leaf node or we are determining it
    const { topic: contentNode, subtopics, loading: contentLoading, refetch } = useStudyTopic(slug);

    const { progress, markMaterialRead, updatePracticeProgress, markTopicComplete } = useStudyProgress();
    const [activeTab, setActiveTab] = useState("notes");

    // State to track if we're redirecting to prevent flash
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Helpers
    const findRootAndType = (subjects: any[], targetSlug: string) => {
        for (const subject of subjects) {
            if (subject.slug === targetSlug) return { root: subject, type: 'subject', node: subject };
            for (const topic of subject.children || []) {
                if (topic.slug === targetSlug) return { root: subject, type: 'topic', node: topic };
                for (const subtopic of topic.children || []) {
                    if (subtopic.slug === targetSlug) return { root: subject, type: 'subtopic', node: subtopic };
                }
            }
        }
        return null;
    };

    const match = findRootAndType(allSubjects, slug);

    // Redirect logic setup
    let redirectDestination: string | null = null;
    let showNoContent = false;

    if (match) {
        const { root, type, node } = match;

        if (type === 'subject' || type === 'topic') {
            let firstSubtopicSlug = null;

            if (type === 'subject') {
                for (const topic of root.children || []) {
                    if (topic.children && topic.children.length > 0) {
                        firstSubtopicSlug = topic.children[0].slug;
                        break;
                    }
                }
            } else if (type === 'topic') {
                if (node.children?.[0]) {
                    firstSubtopicSlug = node.children[0].slug;
                }
            }

            if (firstSubtopicSlug && firstSubtopicSlug !== slug) {
                redirectDestination = `/my-study/${firstSubtopicSlug.replace(/-/g, '/')}`;
            } else if (!firstSubtopicSlug) {
                showNoContent = true;
            }
        }
    }

    // Effect for redirection (Must be called before any returns)
    useEffect(() => {
        if (redirectDestination) {
            setIsRedirecting(true);
            router.replace(redirectDestination);
        }
    }, [redirectDestination, router]);

    // 1. Loading State
    if (structureLoading || isRedirecting || (redirectDestination && !isRedirecting)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{isRedirecting || redirectDestination ? "Redirecting..." : "Loading study content..."}</p>
            </div>
        );
    }

    // 2. Not Found State
    if (!match) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <BookOpen className="w-16 h-16 text-muted-foreground/20 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Topic not found</h2>
                <Button variant="outline" onClick={() => router.push("/my-study")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to My Study
                </Button>
            </div>
        );
    }

    // 3. Dry/Empty State
    if (showNoContent) {
        return (
            <div className="max-w-6xl mx-auto pb-8 p-6 text-center">
                <Button variant="ghost" className="mb-4" onClick={() => router.push("/my-study")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h2 className="text-xl font-semibold">No content available yet</h2>
                <p className="text-muted-foreground">This topic has no subtopics or materials.</p>
            </div>
        );
    }

    const { root, type, node } = match!;

    // At this point, type === 'subtopic' and we have `contentNode` loaded (hopefully)
    // contentNode corresponds to `slug`.

    // Should be handled by contentLoading check but safe guard

    const IconComponent = contentNode?.icon_name ? (iconMap[contentNode.icon_name] || BookOpen) : BookOpen;
    const topicProgress = contentNode ? progress[contentNode.id] : null;
    const readMaterials = topicProgress?.materials_read || [];

    // Notes & Reading filters
    const notesMaterials = contentNode?.materials?.filter(m => m.type === 'note') || [];
    const readingMaterials = contentNode?.materials?.filter(m => m.type === 'reading' || m.type === 'link' || m.type === 'video') || [];

    return (
        <div className="w-full h-full pb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 px-4">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push("/my-study")}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> My Study
                </Button>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium text-foreground">{root.title}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-6 items-start">

                {/* LEFT SIDEBAR - Topics Tree */}
                <div className="hidden md:block sticky top-20">
                    <StudyTopicSidebar
                        topics={root.children || []}
                        currentSubtopicId={contentNode?.id || null}
                        onSelectSubtopic={(sub) => router.push(`/my-study/${sub.slug.replace(/-/g, '/')}`)}
                        progress={progress}
                        className="rounded-xl border border-border/40 shadow-sm"
                    />
                </div>

                {/* RIGHT CONTENT AREA */}
                {/* RIGHT CONTENT AREA */}
                <div className="min-w-0 space-y-6 pr-4">
                    {contentLoading ? (
                        <div className="w-full h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : !contentNode ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <p className="text-muted-foreground">Content not found</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="border-b pb-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="flex-1">
                                        <h1 className="text-3xl font-bold tracking-tight mb-2">{contentNode.title}</h1>
                                        {contentNode.description && (
                                            <p className="text-muted-foreground text-lg leading-relaxed">
                                                {contentNode.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Practice Badge */}
                                    {(contentNode.topic_name || contentNode.subtopic_name) && (
                                        <Badge variant="outline" className="h-8 px-3 text-sm gap-1.5">
                                            <Target className="w-4 h-4 text-green-500" />
                                            Practice Available
                                        </Badge>
                                    )}
                                </div>

                                {/* Progress Bar for this subtopic */}
                                {topicProgress && (
                                    <div className="w-full">
                                        <div className="flex justify-between text-xs mb-1.5 font-medium text-muted-foreground">
                                            <span>Progress</span>
                                            <span>{topicProgress.is_completed ? 'Completed' : 'In Progress'}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-accent overflow-hidden">
                                            <div
                                                className="h-full bg-primary/80 transition-all duration-500"
                                                style={{
                                                    width: `${topicProgress.is_completed ? 100 :
                                                        ((readMaterials.length / Math.max(contentNode.materials?.length || 1, 1)) * 100)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content Tabs */}
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="w-full justify-start mb-6 bg-transparent border-b rounded-none h-auto p-0 gap-6">
                                    <TabsTrigger
                                        value="notes"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 data-[state=active]:shadow-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            <span>Notes</span>
                                            {notesMaterials.length > 0 && (
                                                <span className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                                    {notesMaterials.length}
                                                </span>
                                            )}
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="reading"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 data-[state=active]:shadow-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            <span>Reading</span>
                                            {readingMaterials.length > 0 && (
                                                <span className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                                    {readingMaterials.length}
                                                </span>
                                            )}
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="practice"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 data-[state=active]:shadow-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            <span>Practice</span>
                                        </div>
                                    </TabsTrigger>
                                </TabsList>

                                <div className="min-h-[400px]">
                                    <TabsContent value="notes" className="mt-0">
                                        <StudyMaterialViewer
                                            materials={notesMaterials}
                                            readMaterials={readMaterials}
                                            onMarkRead={(materialId) => markMaterialRead(materialId, contentNode.id)}
                                            filterType="note"
                                        />
                                    </TabsContent>

                                    <TabsContent value="reading" className="mt-0">
                                        <StudyMaterialViewer
                                            materials={readingMaterials}
                                            readMaterials={readMaterials}
                                            onMarkRead={(materialId) => markMaterialRead(materialId, contentNode.id)}
                                        />
                                    </TabsContent>

                                    <TabsContent value="practice" className="mt-0">
                                        <StudyPractice
                                            topicName={contentNode.topic_name}
                                            subtopicName={contentNode.subtopic_name}
                                            topicId={contentNode.id}
                                            onPracticeComplete={(attempted, correct) =>
                                                updatePracticeProgress(contentNode.id, attempted, correct)
                                            }
                                        />
                                    </TabsContent>
                                </div>
                            </Tabs>

                            {/* Mark Complete Check (Manual override) */}
                            {!topicProgress?.is_completed && (
                                <div className="flex justify-end pt-8 border-t mt-8">
                                    <Button
                                        variant="outline"
                                        onClick={() => markTopicComplete(contentNode.id)}
                                        className="gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Mark Unit as Completed
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}



