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
import { useRouter } from "next/navigation";
import {
    Plus, MoreVertical, Pencil, Trash2, Eye, EyeOff,
    FileText, Loader2, GraduationCap, ChevronDown,
    ChevronRight, BookOpen, ExternalLink, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

// Main Admin Page Refactor
export default function StudyContentPage() {
    const {
        topics, allTopics, loading, refetch,
        createTopic, deleteTopic, togglePublish,
    } = useStudyAdmin();

    const [showTopicForm, setShowTopicForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const handleCreateTopic = async (data: any) => {
        setSaving(true);
        try {
            await createTopic(data);
            setShowTopicForm(false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Study Curriculum</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage subjects and topics for the learning path
                    </p>
                </div>
                <Button onClick={() => setShowTopicForm(true)} size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    New Subject
                </Button>
            </div>

            {/* Top Level Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => (
                    <Card
                        key={topic.id}
                        className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1"
                        onClick={() => router.push(`/admin/study-content/${topic.id}`)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary/10"
                                style={{ backgroundColor: `${topic.color || '#6366f1'}15`, color: topic.color || '#6366f1' }}
                            >
                                <BookOpen className="w-6 h-6" />
                            </div>
                            {topic.is_published ? (
                                <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Active</Badge>
                            ) : (
                                <Badge variant="secondary">Draft</Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold mb-1">{topic.title}</div>
                            <div className="flex items-center text-sm text-muted-foreground mb-4">
                                <Layers className="w-4 h-4 mr-1" />
                                {topic.children?.length || 0} Topics
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                                <span className="flex items-center">
                                    <FileText className="w-3 h-3 mr-1" />
                                    {topic.materials?.length || 0} Materials
                                </span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Empty State Card */}
                {topics.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
                        <GraduationCap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-muted-foreground mb-2">No subjects found</h3>
                        <p className="text-sm text-muted-foreground/70 mb-6">
                            Start by creating your first subject to organize content.
                        </p>
                        <Button variant="outline" onClick={() => setShowTopicForm(true)}>
                            Create Subject
                        </Button>
                    </div>
                )}
            </div>

            {/* Create Subject Modal */}
            <Dialog open={showTopicForm} onOpenChange={setShowTopicForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Subject</DialogTitle>
                        <DialogDescription>
                            Add a top-level subject area (e.g. Mathematics, Science).
                        </DialogDescription>
                    </DialogHeader>
                    <StudyTopicForm
                        parentOptions={[]} // No parent for root
                        onSubmit={handleCreateTopic}
                        onCancel={() => setShowTopicForm(false)}
                        isLoading={saving}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
