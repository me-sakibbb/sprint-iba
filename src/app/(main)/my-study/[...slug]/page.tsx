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
    const pathSegments = Array.isArray(unwrappedParams.slug) ? unwrappedParams.slug : [unwrappedParams.slug];
    const slug = pathSegments[pathSegments.length - 1];

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

    // Canonical URL check - if current URL is flat, redirect to hierarchical
    let redirectDestination: string | null = null;

    if (match) {
        const { root, type, node } = match;
        let expectedPath: string[] = [];

        if (type === 'subject') {
            // Subjects should redirect to first topic if they have one
            const firstTopic = root.children?.[0];
            if (firstTopic) {
                redirectDestination = `/my-study/${root.slug}/${firstTopic.slug}`;
            }
        } else if (type === 'topic') {
            expectedPath = [root.slug, node.slug];
        } else if (type === 'subtopic') {
            const parentTopic = root.children?.find((t: any) => t.children?.some((c: any) => c.id === node.id));
            if (parentTopic) expectedPath = [root.slug, parentTopic.slug, node.slug];
            else expectedPath = [root.slug, node.slug];
        }

        const currentPath = pathSegments;
        if (expectedPath.length > 0 && (currentPath.length !== expectedPath.length || currentPath.some((s, i) => s !== expectedPath[i]))) {
            redirectDestination = `/my-study/${expectedPath.join('/')}`;
        }
    }

    // Effect for redirection (Must be called before any returns)
    useEffect(() => {
        if (redirectDestination) {
            setIsRedirecting(true);
            router.replace(redirectDestination);
        }
    }, [redirectDestination, router]);

    // 1. Loading State - Skeleton Layout
    if (structureLoading || isRedirecting || (redirectDestination && !isRedirecting)) {
        return (
            <div className="w-full h-full pb-8 pt-6 px-6">
                {/* Breadcrumbs Skeleton */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-20 h-4 rounded bg-muted animate-pulse" />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div className="w-32 h-4 rounded bg-muted animate-pulse" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-6 items-start">
                    {/* LEFT SIDEBAR SKELETON */}
                    <div className="hidden md:block sticky top-20">
                        <div className="rounded-xl border border-border/40 shadow-sm bg-background h-[calc(100vh-6rem)] overflow-hidden">
                            <div className="p-4 border-b">
                                <div className="w-24 h-4 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="p-2 space-y-2">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="w-full h-10 rounded bg-muted/50 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT CONTENT SKELETON */}
                    <div className="min-w-0 space-y-6 pr-4">
                        {/* Title & Desc */}
                        <div className="border-b pb-6 space-y-4">
                            <div className="w-3/4 h-8 rounded bg-muted animate-pulse" />
                            <div className="w-full h-4 rounded bg-muted/50 animate-pulse" />
                            <div className="w-2/3 h-4 rounded bg-muted/50 animate-pulse" />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 border-b pb-2">
                            <div className="w-20 h-8 rounded bg-muted animate-pulse" />
                            <div className="w-20 h-8 rounded bg-muted animate-pulse" />
                            <div className="w-20 h-8 rounded bg-muted animate-pulse" />
                        </div>

                        {/* Content Block */}
                        <div className="w-full h-64 rounded bg-muted/30 animate-pulse" />
                    </div>
                </div>
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

    // 3. Dry/Empty State check removed as showNoContent logic was removed
    // We can rely on contentNode check below

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
        <div className="w-full h-full pb-8 pt-6 px-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-hidden">
                <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0" onClick={() => router.push("/my-study")}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> My Study
                </Button>
                <ChevronRight className="w-4 h-4 shrink-0" />
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="font-medium text-foreground whitespace-nowrap">{root.title}</span>
                    {type !== 'subject' && (
                        <>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                            <span className="font-medium text-foreground truncate max-w-[150px]" title={type === 'topic' ? node.title : root.children?.find((t: any) => t.children?.some((c: any) => c.id === node.id))?.title}>
                                {type === 'topic' ? node.title : root.children?.find((t: any) => t.children?.some((c: any) => c.id === node.id))?.title}
                            </span>
                        </>
                    )}
                    {type === 'subtopic' && (
                        <>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                            <span className="font-medium text-primary truncate max-w-[150px]" title={node.title}>{node.title}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-6 items-start">

                {/* LEFT SIDEBAR - Topics Tree */}
                <div className="hidden md:block sticky top-20">
                    <StudyTopicSidebar
                        topics={root.children || []}
                        currentSubtopicId={contentNode?.id || null}
                        onSelectSubtopic={(sub) => {
                            const topic = root.children?.find((t: any) => t.children?.some((c: any) => c.id === sub.id));
                            if (topic) router.push(`/my-study/${root.slug}/${topic.slug}/${sub.slug}`);
                            else router.push(`/my-study/${root.slug}/${sub.slug}`);
                        }}
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
                                            topicName={match.type !== 'subtopic' ? (contentNode.topic_name || contentNode.title) : null}
                                            subtopicName={match.type === 'subtopic' ? (contentNode.subtopic_name || contentNode.title) : null}
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



