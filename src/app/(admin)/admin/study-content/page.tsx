"use client";

import { useState } from "react";
import { useStudyAdmin, AdminStudyTopic } from "@/hooks/useStudyAdmin";
import StudyTopicForm from "@/components/admin/StudyTopicForm";
import StudyMaterialForm from "@/components/admin/StudyMaterialForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Plus, MoreVertical, Pencil, Trash2, Eye, EyeOff,
    FileText, Loader2, GraduationCap, ChevronDown,
    ChevronRight, BookOpen, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudyContentPage() {
    const {
        topics, allTopics, loading, refetch,
        createTopic, updateTopic, deleteTopic, togglePublish,
        createMaterial, updateMaterial, deleteMaterial,
    } = useStudyAdmin();

    // Dialog states
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [editingTopic, setEditingTopic] = useState<AdminStudyTopic | null>(null);
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<any>(null);
    const [materialTopicId, setMaterialTopicId] = useState<string>("");
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'topic' | 'material'; id: string; name: string } | null>(null);
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    const toggleExpanded = (id: string) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ─── Topic CRUD handlers ──────────────────────────────────────
    const handleCreateTopic = async (data: any) => {
        setSaving(true);
        try {
            await createTopic(data);
            setShowTopicForm(false);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTopic = async (data: any) => {
        if (!editingTopic) return;
        setSaving(true);
        try {
            await updateTopic(editingTopic.id, data);
            setEditingTopic(null);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateMaterial = async (data: any) => {
        setSaving(true);
        try {
            await createMaterial({ ...data, study_topic_id: materialTopicId });
            setShowMaterialForm(false);
            setMaterialTopicId("");
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
            if (deleteConfirm.type === 'topic') await deleteTopic(deleteConfirm.id);
            else await deleteMaterial(deleteConfirm.id);
        } finally {
            setDeleteConfirm(null);
        }
    };

    // ─── Topic Row Component ─────────────────────────────────────
    const TopicRow = ({ topic, depth = 0 }: { topic: AdminStudyTopic; depth?: number }) => {
        const isExpanded = expandedTopics.has(topic.id);
        const hasContent = topic.materials.length > 0 || topic.children.length > 0;

        return (
            <div>
                <div
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-accent/50 transition-colors group",
                        !topic.is_published && "opacity-60"
                    )}
                    style={{ paddingLeft: `${12 + depth * 24}px` }}
                >
                    {/* Expand toggle */}
                    <button
                        onClick={() => toggleExpanded(topic.id)}
                        className={cn(
                            "w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-accent",
                            !hasContent && "invisible"
                        )}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>

                    {/* Color dot */}
                    <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: topic.color || '#6366f1' }}
                    />

                    {/* Title + Meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{topic.title}</span>
                            {topic.parent_id && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">subtopic</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            {topic.topic_name && (
                                <span className="text-xs text-muted-foreground">
                                    📎 {topic.topic_name}
                                    {topic.subtopic_name && ` → ${topic.subtopic_name}`}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            {topic.materials.length}
                        </Badge>
                        {topic.children.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {topic.children.length} sub
                            </Badge>
                        )}
                        <Badge
                            variant={topic.is_published ? "default" : "outline"}
                            className={cn(
                                "text-xs",
                                topic.is_published ? "bg-green-500/10 text-green-600 border-green-500/30" : ""
                            )}
                        >
                            {topic.is_published ? "Published" : "Draft"}
                        </Badge>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingTopic(topic)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Topic
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublish(topic.id, topic.is_published)}>
                                {topic.is_published ? (
                                    <><EyeOff className="w-4 h-4 mr-2" /> Unpublish</>
                                ) : (
                                    <><Eye className="w-4 h-4 mr-2" /> Publish</>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setMaterialTopicId(topic.id);
                                setShowMaterialForm(true);
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Material
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => window.open(`/my-study/${topic.slug}`, '_blank')}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteConfirm({ type: 'topic', id: topic.id, name: topic.title })}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Expanded content: materials + children */}
                {isExpanded && (
                    <div className="ml-4">
                        {/* Materials list */}
                        {topic.materials.length > 0 && (
                            <div className="space-y-1 py-1" style={{ paddingLeft: `${12 + depth * 24}px` }}>
                                {topic.materials.map(mat => (
                                    <div
                                        key={mat.id}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30 transition-colors group/mat text-sm"
                                    >
                                        <span className="text-muted-foreground">
                                            {mat.type === 'note' ? '📝' :
                                                mat.type === 'reading' ? '📖' :
                                                    mat.type === 'link' ? '🔗' : '🎥'}
                                        </span>
                                        <span className="flex-1 truncate">{mat.title}</span>
                                        <Badge variant="outline" className="text-[10px]">
                                            {mat.type}
                                        </Badge>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/mat:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setEditingMaterial(mat)}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => setDeleteConfirm({ type: 'material', id: mat.id, name: mat.title })}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Children */}
                        {topic.children.map(child => (
                            <TopicRow key={child.id} topic={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Study Content</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage study topics, notes, and reading materials
                        </p>
                    </div>
                </div>
                <Button onClick={() => setShowTopicForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Topic
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-border/40">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{allTopics.length}</div>
                        <div className="text-sm text-muted-foreground">Total Topics</div>
                    </CardContent>
                </Card>
                <Card className="border-border/40">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {allTopics.filter(t => t.is_published).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Published</div>
                    </CardContent>
                </Card>
                <Card className="border-border/40">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {allTopics.filter(t => !t.is_published).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Drafts</div>
                    </CardContent>
                </Card>
            </div>

            {/* Topics Tree */}
            <Card className="border-border/40">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Topics & Materials
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    {topics.length > 0 ? (
                        <div className="space-y-1">
                            {topics.map(topic => (
                                <TopicRow key={topic.id} topic={topic} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-muted-foreground mb-1">
                                No topics yet
                            </h3>
                            <p className="text-sm text-muted-foreground/70 mb-4">
                                Create your first study topic to get started.
                            </p>
                            <Button onClick={() => setShowTopicForm(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Topic
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Create Topic Dialog ─────────────────────────────── */}
            <Dialog open={showTopicForm} onOpenChange={setShowTopicForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Study Topic</DialogTitle>
                        <DialogDescription>
                            Add a new topic to the study curriculum.
                        </DialogDescription>
                    </DialogHeader>
                    <StudyTopicForm
                        parentOptions={allTopics
                            .filter(t => {
                                if (!t.parent_id) return true;
                                const parent = allTopics.find(p => p.id === t.parent_id);
                                return parent && !parent.parent_id;
                            })
                            .map(t => ({
                                id: t.id,
                                title: `${!t.parent_id ? 'Subject' : 'Topic'}: ${t.title}`
                            }))}
                        onSubmit={handleCreateTopic}
                        onCancel={() => setShowTopicForm(false)}
                        isLoading={saving}
                    />
                </DialogContent>
            </Dialog>

            {/* ─── Edit Topic Dialog ───────────────────────────────── */}
            <Dialog open={!!editingTopic} onOpenChange={() => setEditingTopic(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Study Topic</DialogTitle>
                        <DialogDescription>
                            Update topic details and settings.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTopic && (
                        <StudyTopicForm
                            initialData={{
                                title: editingTopic.title,
                                description: editingTopic.description || '',
                                icon_name: editingTopic.icon_name || 'BookOpen',
                                color: editingTopic.color || '#6366f1',
                                parent_id: editingTopic.parent_id,
                                topic_name: editingTopic.topic_name || '',
                                subtopic_name: editingTopic.subtopic_name || '',
                                is_published: editingTopic.is_published,
                            }}
                            parentOptions={allTopics
                                .filter(t => {
                                    if (t.id === editingTopic.id) return false;
                                    if (!t.parent_id) return true;
                                    const parent = allTopics.find(p => p.id === t.parent_id);
                                    return parent && !parent.parent_id;
                                })
                                .map(t => ({
                                    id: t.id,
                                    title: `${!t.parent_id ? 'Subject' : 'Topic'}: ${t.title}`
                                }))}
                            onSubmit={handleUpdateTopic}
                            onCancel={() => setEditingTopic(null)}
                            isLoading={saving}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Create Material Dialog ──────────────────────────── */}
            <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Material</DialogTitle>
                        <DialogDescription>
                            Add notes, reading materials, links, or videos.
                        </DialogDescription>
                    </DialogHeader>
                    <StudyMaterialForm
                        onSubmit={handleCreateMaterial}
                        onCancel={() => setShowMaterialForm(false)}
                        isLoading={saving}
                    />
                </DialogContent>
            </Dialog>

            {/* ─── Edit Material Dialog ─────────────────────────────── */}
            <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Material</DialogTitle>
                        <DialogDescription>
                            Update material content and settings.
                        </DialogDescription>
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
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation ─────────────────────────────── */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &quot;{deleteConfirm?.name}&quot;
                            {deleteConfirm?.type === 'topic' && ' and all its materials'}.
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
        </div>
    );
}
