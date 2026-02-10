"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudyAdmin, AdminStudyTopic } from "@/hooks/useStudyAdmin";
import StudyTopicForm from "@/components/admin/StudyTopicForm";
import StudyMaterialForm from "@/components/admin/StudyMaterialForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Plus, MoreVertical, Pencil, Trash2, Eye, EyeOff,
    FileText, Loader2, ArrowLeft, BookOpen, Presentation, Target, Sparkles, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function StudyTopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const { topicId } = unwrappedParams;
    const {
        allTopics, loading, refetch,
        createTopic, updateTopic, deleteTopic, togglePublish,
        createMaterial, updateMaterial, deleteMaterial,
    } = useStudyAdmin();

    const [currentTopic, setCurrentTopic] = useState<AdminStudyTopic | null>(null);
    const [subtopics, setSubtopics] = useState<AdminStudyTopic[]>([]);

    // Dialog states
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [editingTopic, setEditingTopic] = useState<AdminStudyTopic | null>(null);
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'topic' | 'material'; id: string; name: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("reading");

    useEffect(() => {
        if (!loading && allTopics.length > 0) {
            const topic = allTopics.find(t => t.id === topicId);
            if (topic) {
                // Reconstruct the topic with full children/materials context locally or assume useStudyAdmin handles it?
                // useStudyAdmin returns a tree in `topics` but flat list in `allTopics`.
                // We need to find children manually from allTopics.
                const children = allTopics.filter(t => t.parent_id === topicId)
                    .sort((a, b) => a.sort_order - b.sort_order);

                // We need materials for this specific topic. 
                // The hook fetches all materials but doesn't expose them in a simple map in the return.
                // Wait, useStudyAdmin hook logic:
                // It fetches all materials and maps them in the `topics` tree.
                // But `allTopics` is just the raw topic list.
                // We need to re-fetch or filter materials. 
                // Actually `useStudyAdmin` does fetch materials but stores them in the tree structure `topics`.
                // Let's traverse the `topics` tree to find our node with materials attached.

                // Helper to find node in tree
                // Since `topics` from hook are roots, we can traverse.
                // BUT `allTopics` is easier if we had materials.
                // The hook needs to expose materials or we find the node in the tree.
            }
        }
    }, [allTopics, topicId, loading]);

    // Let's rely on finding the node in the tree structure which has materials attached
    const findNode = (nodes: AdminStudyTopic[], id: string): AdminStudyTopic | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    // Get the full topic object with materials from the hook's `topics` tree
    const { topics: topicTree } = useStudyAdmin();

    useEffect(() => {
        if (topicTree.length > 0) {
            const found = findNode(topicTree, topicId);
            if (found) {
                setCurrentTopic(found);
                setSubtopics(found.children || []);
            }
        }
    }, [topicTree, topicId]);


    // Handlers
    const handleCreateSubtopic = async (data: any) => {
        setSaving(true);
        try {
            await createTopic({ ...data, parent_id: topicId });
            setShowTopicForm(false);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateMaterial = async (data: any) => {
        setSaving(true);
        try {
            // Map the tab to the correct type if needed, or let the form handle it?
            // Form usually has a type selector. We can pre-fill it based on active tab.
            const type = activeTab === 'notes' ? 'note' :
                activeTab === 'reading' ? (data.type || 'reading') : // reading tab allows reading/video/link
                    'note'; // default

            await createMaterial({ ...data, study_topic_id: topicId });
            setShowMaterialForm(false);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateMaterial = async (data: any) => {
        if (!editingMaterial) return;
        setSaving(true);
        try {
            await updateMaterial(editingMaterial.id, data);
            setEditingMaterial(null);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            if (deleteConfirm.type === 'topic') {
                await deleteTopic(deleteConfirm.id);
                // If we deleted a subtopic, we stay here. If we deleted THIS topic (not possible from here directly usually), we go back.
            } else {
                await deleteMaterial(deleteConfirm.id);
            }
        } finally {
            setDeleteConfirm(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!currentTopic && !loading && topicTree.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground mb-4">Topic not found.</p>
                <Button onClick={() => router.push('/admin/study-content')}>Back to Study Content</Button>
            </div>
        );
    }

    if (!currentTopic) return null;

    // Filter materials by tab
    const readingMaterials = currentTopic.materials?.filter(m => ['reading', 'video', 'link'].includes(m.type)) || [];
    const noteMaterials = currentTopic.materials?.filter(m => m.type === 'note') || [];
    // Practice? Assuming unrelated to materials table for now, or maybe specific 'practice' type materials?
    // User requested "Notes, Reading, Practice".
    // If practice is questions, we might need a different list or component.
    // For now, let's assume practice is managed via a distinct UI or it's a type of material.
    // UseStudyAdmin hook doesn't seem to fetch questions.


    // Helper to determine depth
    const getDepth = (id: string, topics: any[]) => {
        let depth = 0;
        let current = topics.find(t => t.id === id);
        while (current?.parent_id) {
            depth++;
            current = topics.find(t => t.id === current!.parent_id);
        }
        return depth;
    };

    const depth = currentTopic ? getDepth(currentTopic.id, allTopics) : 0;
    const isSubtopic = depth >= 2;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header / Breadcrumb-ish */}
            <div className="flex items-center gap-4 mb-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${currentTopic.color || '#6366f1'}15`, color: currentTopic.color || '#6366f1' }}
                    >
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {depth === 0 && <Badge variant="outline">Subject</Badge>}
                            {depth === 1 && <Badge variant="outline">Topic</Badge>}
                            {depth >= 2 && <Badge variant="outline">Subtopic</Badge>}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{currentTopic.title}</h1>
                        <p className="text-muted-foreground">{currentTopic.description || 'Manage content for this topic'}</p>
                    </div>
                </div>
                {/* Actions for the topic itself could go here */}
            </div>

            {/* Subtopics Grid (for Depth 0 & 1) */}
            {!isSubtopic && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            {depth === 0 ? "Topics" : "Subtopics"}
                            <Badge variant="secondary" className="ml-2">{subtopics.length}</Badge>
                        </h2>
                        <Button size="sm" onClick={() => setShowTopicForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add {depth === 0 ? "Topic" : "Subtopic"}
                        </Button>
                    </div>

                    {subtopics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subtopics.map(topic => (
                                <Card
                                    key={topic.id}
                                    className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
                                    onClick={() => router.push(`/admin/study-content/${topic.id}`)}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-10 rounded-full" style={{ backgroundColor: topic.color || '#6366f1' }} />
                                            <div>
                                                <h3 className="font-semibold group-hover:text-primary transition-colors">{topic.title}</h3>
                                                <p className="text-xs text-muted-foreground">{topic.children?.length || 0} nested items</p>
                                            </div>
                                        </div>
                                        <MoreVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground/60 bg-muted/5">
                            <p>No {depth === 0 ? "topics" : "subtopics"} created yet.</p>
                            <Button variant="link" onClick={() => setShowTopicForm(true)}>
                                Create one now
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Content Tabs (Only for Subtopics - Depth >= 2) */}
            {isSubtopic ? (
                <div className="mt-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList>
                                <TabsTrigger value="reading" className="gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    Reading
                                    <Badge variant="secondary" className="ml-1 text-[10px]">{readingMaterials.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="notes" className="gap-2">
                                    <Presentation className="w-4 h-4" />
                                    Notes
                                    <Badge variant="secondary" className="ml-1 text-[10px]">{noteMaterials.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="practice" className="gap-2">
                                    <Target className="w-4 h-4" />
                                    Practice
                                </TabsTrigger>
                            </TabsList>

                            <Button onClick={() => {
                                setShowMaterialForm(true);
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Content
                            </Button>
                        </div>

                        <TabsContent value="reading" className="space-y-4">
                            {readingMaterials.length > 0 ? (
                                <div className="grid gap-3">
                                    {readingMaterials.map(mat => (
                                        <MaterialCard
                                            key={mat.id}
                                            material={mat}
                                            onEdit={() => setEditingMaterial(mat)}
                                            onDelete={() => setDeleteConfirm({ type: 'material', id: mat.id, name: mat.title })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState label="reading materials" />
                            )}
                        </TabsContent>

                        <TabsContent value="notes" className="space-y-4">
                            {noteMaterials.length > 0 ? (
                                <div className="grid gap-3">
                                    {noteMaterials.map(mat => (
                                        <MaterialCard
                                            key={mat.id}
                                            material={mat}
                                            onEdit={() => setEditingMaterial(mat)}
                                            onDelete={() => setDeleteConfirm({ type: 'material', id: mat.id, name: mat.title })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState label="notes" />
                            )}
                        </TabsContent>

                        <TabsContent value="practice">
                            <div className="p-12 text-center border rounded-lg bg-muted/10">
                                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">Practice Questions</h3>
                                <p className="text-muted-foreground mb-4">
                                    Manage practice questions for this topic in the Question Bank.
                                </p>
                                <Button variant="outline" onClick={() => router.push('/admin/questions')}>
                                    Go to Question Bank
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            ) : (
                // Hint for users on parent pages
                subtopics.length > 0 && (
                    <div className="mt-8 p-4 border rounded-lg bg-muted/10 flex items-center justify-center text-muted-foreground text-sm">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Navigate to a {depth === 0 ? "Topic" : "Subtopic"} to manage learning content.
                    </div>
                )
            )}

            {/* Dialogs */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{deleteConfirm?.name}".
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showTopicForm} onOpenChange={setShowTopicForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Subtopic</DialogTitle>
                    </DialogHeader>
                    <StudyTopicForm
                        parentOptions={[{ id: topicId, title: currentTopic.title }]}
                        onSubmit={handleCreateSubtopic}
                        onCancel={() => setShowTopicForm(false)}
                        isLoading={saving}
                        initialData={{ parent_id: topicId }}
                    // Force parent_id to be this topic
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add Material</DialogTitle>
                        <DialogDescription>
                            Add content to {activeTab === 'notes' ? 'Notes' : 'Reading'} tab.
                        </DialogDescription>
                    </DialogHeader>
                    <StudyMaterialForm
                        onSubmit={handleCreateMaterial}
                        onCancel={() => setShowMaterialForm(false)}
                        isLoading={saving}
                        initialData={{ type: activeTab === 'notes' ? 'note' : 'reading' }}
                        mode={activeTab === 'reading' ? 'reading' : 'default'}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Material</DialogTitle>
                    </DialogHeader>
                    {editingMaterial && (
                        <StudyMaterialForm
                            initialData={{
                                title: editingMaterial.title,
                                content: editingMaterial.content || '',
                                type: editingMaterial.type,
                                url: editingMaterial.url || '',
                                is_published: editingMaterial.is_published,
                            }}
                            onSubmit={handleUpdateMaterial}
                            onCancel={() => setEditingMaterial(null)}
                            isLoading={saving}
                            mode={activeTab === 'reading' ? 'reading' : 'default'}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MaterialCard({ material, onEdit, onDelete }: { material: any, onEdit: () => void, onDelete: () => void }) {
    return (
        <Card className="hover:bg-accent/5 transition-colors group">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    material.type === 'note' ? "bg-indigo-100 text-indigo-600" :
                        material.type === 'video' ? "bg-red-100 text-red-600" :
                            "bg-blue-100 text-blue-600"
                )}>
                    {material.type === 'note' ? <FileText className="w-5 h-5" /> :
                        material.type === 'video' ? <Presentation className="w-5 h-5" /> :
                            <BookOpen className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{material.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="outline" className="text-[10px] uppercase">{material.type}</Badge>
                        {material.is_published ? (
                            <span className="text-green-600 flex items-center gap-1"><Eye className="w-3 h-3" /> Published</span>
                        ) : (
                            <span className="text-amber-600 flex items-center gap-1"><EyeOff className="w-3 h-3" /> Draft</span>
                        )}
                        <span className="truncate max-w-[200px]">{material.url}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onDelete}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/5">
            <Sparkles className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground">No {label} found.</p>
            <p className="text-xs text-muted-foreground/60">Add some content to get started.</p>
        </div>
    );
}
