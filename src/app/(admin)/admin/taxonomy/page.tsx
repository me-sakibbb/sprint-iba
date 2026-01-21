"use client";

import { useState } from 'react';
import {
    BookOpen, Tag, Layers, Plus, Pencil, Trash2,
    Loader2, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSubjects, useTopics, useSubtopics, Subject, Topic, Subtopic } from "@/hooks/useTaxonomy";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TaxonomyPage() {
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

    const {
        subjects,
        loading: subjectsLoading,
        createSubject,
        updateSubject,
        deleteSubject,
    } = useSubjects();

    const {
        topics,
        loading: topicsLoading,
        createTopic,
        updateTopic,
        deleteTopic,
    } = useTopics(selectedSubject?.id);

    const {
        subtopics,
        loading: subtopicsLoading,
        createSubtopic,
        updateSubtopic,
        deleteSubtopic,
    } = useSubtopics(selectedTopic?.id);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        Taxonomy Management
                    </h1>
                    <p className="text-slate-500 mt-1">Organize questions by subject, topic, and subtopic</p>
                </div>
            </div>

            {/* Three-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subjects Column */}
                <SubjectsColumn
                    subjects={subjects}
                    loading={subjectsLoading}
                    selectedSubject={selectedSubject}
                    onSelect={setSelectedSubject}
                    onCreate={createSubject}
                    onUpdate={updateSubject}
                    onDelete={deleteSubject}
                />

                {/* Topics Column */}
                <TopicsColumn
                    topics={topics}
                    loading={topicsLoading}
                    selectedSubject={selectedSubject}
                    selectedTopic={selectedTopic}
                    onSelect={setSelectedTopic}
                    onCreate={createTopic}
                    onUpdate={updateTopic}
                    onDelete={deleteTopic}
                />

                {/* Subtopics Column */}
                <SubtopicsColumn
                    subtopics={subtopics}
                    loading={subtopicsLoading}
                    selectedTopic={selectedTopic}
                    onCreate={createSubtopic}
                    onUpdate={updateSubtopic}
                    onDelete={deleteSubtopic}
                />
            </div>
        </div>
    );
}

// --- Subjects Column ---
function SubjectsColumn({
    subjects,
    loading,
    selectedSubject,
    onSelect,
    onCreate,
    onUpdate,
    onDelete,
}: {
    subjects: Subject[];
    loading: boolean;
    selectedSubject: Subject | null;
    onSelect: (subject: Subject | null) => void;
    onCreate: (name: string, description?: string) => Promise<any>;
    onUpdate: (id: string, updates: Partial<Subject>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [isCreating, setIsCreating] = useState(false);

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Subjects
                    <Badge variant="secondary" className="ml-auto">{subjects.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <CreateItemDialog
                    title="Create Subject"
                    description="Add a new subject category"
                    onSubmit={async (name, description) => {
                        await onCreate(name, description);
                    }}
                    trigger={
                        <Button variant="outline" size="sm" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Subject
                        </Button>
                    }
                />

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[600px] overflow-y-auto">
                        {subjects.map(subject => (
                            <TaxonomyItem
                                key={subject.id}
                                item={subject}
                                isSelected={selectedSubject?.id === subject.id}
                                onSelect={() => onSelect(subject)}
                                onUpdate={(updates) => onUpdate(subject.id, updates)}
                                onDelete={() => onDelete(subject.id)}
                                icon={<BookOpen className="w-3 h-3" />}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Topics Column ---
function TopicsColumn({
    topics,
    loading,
    selectedSubject,
    selectedTopic,
    onSelect,
    onCreate,
    onUpdate,
    onDelete,
}: {
    topics: Topic[];
    loading: boolean;
    selectedSubject: Subject | null;
    selectedTopic: Topic | null;
    onSelect: (topic: Topic | null) => void;
    onCreate: (subjectId: string, name: string, description?: string) => Promise<any>;
    onUpdate: (id: string, updates: Partial<Topic>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    if (!selectedSubject) {
        return (
            <Card className="border-slate-200">
                <CardContent className="pt-6">
                    <div className="text-center py-12 text-slate-400 text-sm">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Select a subject to view topics
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    Topics
                    <Badge variant="secondary" className="ml-auto">{topics.length}</Badge>
                </CardTitle>
                <p className="text-xs text-slate-500">in {selectedSubject.name}</p>
            </CardHeader>
            <CardContent className="space-y-2">
                <CreateItemDialog
                    title="Create Topic"
                    description={`Add a new topic under ${selectedSubject.name}`}
                    onSubmit={async (name, description) => {
                        await onCreate(selectedSubject.id, name, description);
                    }}
                    trigger={
                        <Button variant="outline" size="sm" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Topic
                        </Button>
                    }
                />

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[600px] overflow-y-auto">
                        {topics.map(topic => (
                            <TaxonomyItem
                                key={topic.id}
                                item={topic}
                                isSelected={selectedTopic?.id === topic.id}
                                onSelect={() => onSelect(topic)}
                                onUpdate={(updates) => onUpdate(topic.id, updates)}
                                onDelete={() => onDelete(topic.id)}
                                icon={<Tag className="w-3 h-3" />}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Subtopics Column ---
function SubtopicsColumn({
    subtopics,
    loading,
    selectedTopic,
    onCreate,
    onUpdate,
    onDelete,
}: {
    subtopics: Subtopic[];
    loading: boolean;
    selectedTopic: Topic | null;
    onCreate: (topicId: string, name: string, description?: string) => Promise<any>;
    onUpdate: (id: string, updates: Partial<Subtopic>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    if (!selectedTopic) {
        return (
            <Card className="border-slate-200">
                <CardContent className="pt-6">
                    <div className="text-center py-12 text-slate-400 text-sm">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Select a topic to view subtopics
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Subtopics
                    <Badge variant="secondary" className="ml-auto">{subtopics.length}</Badge>
                </CardTitle>
                <p className="text-xs text-slate-500">in {selectedTopic.name}</p>
            </CardHeader>
            <CardContent className="space-y-2">
                <CreateItemDialog
                    title="Create Subtopic"
                    description={`Add a new subtopic under ${selectedTopic.name}`}
                    onSubmit={async (name, description) => {
                        await onCreate(selectedTopic.id, name, description);
                    }}
                    trigger={
                        <Button variant="outline" size="sm" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Subtopic
                        </Button>
                    }
                />

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[600px] overflow-y-auto">
                        {subtopics.map(subtopic => (
                            <TaxonomyItem
                                key={subtopic.id}
                                item={subtopic}
                                isSelected={false}
                                onSelect={() => { }}
                                onUpdate={(updates) => onUpdate(subtopic.id, updates)}
                                onDelete={() => onDelete(subtopic.id)}
                                icon={<Layers className="w-3 h-3" />}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Reusable Item Component ---
function TaxonomyItem({
    item,
    isSelected,
    onSelect,
    onUpdate,
    onDelete,
    icon,
}: {
    item: Subject | Topic | Subtopic;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: any) => Promise<void>;
    onDelete: () => Promise<void>;
    icon: React.ReactNode;
}) {
    const [showDelete, setShowDelete] = useState(false);
    const questionCount = (item as any).question_count || 0;

    return (
        <>
            <div
                onClick={onSelect}
                className={`group p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                    ? 'bg-indigo-50 border-indigo-200'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                                {item.name}
                            </h4>
                            {item.description && (
                                <p className="text-xs text-slate-500 truncate">{item.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">
                            {questionCount}
                        </Badge>

                        <EditItemDialog
                            item={item}
                            onSubmit={onUpdate}
                            trigger={
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                    <Pencil className="w-3 h-3" />
                                </Button>
                            }
                        />

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDelete(true);
                            }}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {isSelected && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                        <ChevronRight className="w-3 h-3" />
                        Selected
                    </div>
                )}
            </div>

            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this item and all nested items.
                            {questionCount > 0 && (
                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>This item has {questionCount} associated questions.</span>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-rose-600 hover:bg-rose-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// --- Create Dialog ---
function CreateItemDialog({
    title,
    description,
    onSubmit,
    trigger,
}: {
    title: string;
    description: string;
    onSubmit: (name: string, description?: string) => Promise<any>;
    trigger: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onSubmit(name, desc || undefined);
            setName('');
            setDesc('');
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter name..."
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Optional description..."
                            className="mt-1"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Edit Dialog ---
function EditItemDialog({
    item,
    onSubmit,
    trigger,
}: {
    item: any;
    onSubmit: (updates: any) => Promise<void>;
    trigger: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(item.name);
    const [desc, setDesc] = useState(item.description || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onSubmit({ name, description: desc || null });
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
                setName(item.name);
                setDesc(item.description || '');
            }
        }}>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                {trigger}
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Edit {item.name}</DialogTitle>
                    <DialogDescription>Update the name and description</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="edit-name">Name *</Label>
                        <Input
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                            id="edit-description"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="mt-1"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
