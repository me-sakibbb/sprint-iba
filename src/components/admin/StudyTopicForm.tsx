"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    BookOpen, Calculator, Languages, Brain, Lightbulb, Code,
    Beaker, Globe, Music, Palette, PenTool, Trophy, GraduationCap, Layers,
    Save, X
} from "lucide-react";

const availableIcons = [
    'BookOpen', 'Calculator', 'Languages', 'Brain', 'Lightbulb', 'Code',
    'Beaker', 'Globe', 'Music', 'Palette', 'PenTool', 'Trophy', 'GraduationCap', 'Layers',
];

const iconMap: Record<string, any> = {
    BookOpen, Calculator, Languages, Brain, Lightbulb, Code,
    Beaker, Globe, Music, Palette, PenTool, Trophy, GraduationCap, Layers,
};

const presetColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface StudyTopicFormProps {
    initialData?: {
        title?: string;
        description?: string;
        icon_name?: string;
        color?: string;
        parent_id?: string | null;
        topic_name?: string;
        subtopic_name?: string;
        is_published?: boolean;
    };
    parentOptions: { id: string; title: string }[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function StudyTopicForm({
    initialData,
    parentOptions,
    onSubmit,
    onCancel,
    isLoading,
}: StudyTopicFormProps) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [iconName, setIconName] = useState(initialData?.icon_name || "BookOpen");
    const [color, setColor] = useState(initialData?.color || "#6366f1");
    const [parentId, setParentId] = useState<string | null>(initialData?.parent_id || null);
    const [topicName, setTopicName] = useState(initialData?.topic_name || "");
    const [subtopicName, setSubtopicName] = useState(initialData?.subtopic_name || "");
    const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            description: description || null,
            icon_name: iconName,
            color,
            parent_id: parentId || null,
            topic_name: topicName || null,
            subtopic_name: subtopicName || null,
            is_published: isPublished,
        });
    };

    const SelectedIcon = iconMap[iconName] || BookOpen;

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., English Grammar"
                    required
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this topic..."
                    rows={3}
                />
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select value={iconName} onValueChange={setIconName}>
                        <SelectTrigger>
                            <div className="flex items-center gap-2">
                                <SelectedIcon className="w-4 h-4" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {availableIcons.map(icon => {
                                const Icon = iconMap[icon];
                                return (
                                    <SelectItem key={icon} value={icon}>
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4" />
                                            {icon}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                        {presetColors.map(c => (
                            <button
                                key={c}
                                type="button"
                                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Parent Topic */}
            <div className="space-y-2">
                <Label>Parent Topic (leave empty for top-level)</Label>
                <Select
                    value={parentId || "none"}
                    onValueChange={(v) => setParentId(v === "none" ? null : v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None (top-level)</SelectItem>
                        {parentOptions.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Question Mapping */}
            <div className="p-4 rounded-lg border border-border/50 bg-accent/30 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Question Mapping (for Practice)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="topicName">Topic Name</Label>
                        <Input
                            id="topicName"
                            value={topicName}
                            onChange={(e) => setTopicName(e.target.value)}
                            placeholder="Matches questions.topic"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subtopicName">Subtopic Name</Label>
                        <Input
                            id="subtopicName"
                            value={subtopicName}
                            onChange={(e) => setSubtopicName(e.target.value)}
                            placeholder="Matches questions.subtopic"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Map to existing question topic/subtopic names to enable practice filtering.
                </p>
            </div>

            {/* Published */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                <div>
                    <Label>Published</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Only published topics are visible to students
                    </p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
                <Button type="submit" disabled={!title || isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    {initialData ? 'Update Topic' : 'Create Topic'}
                </Button>
            </div>
        </form>
    );
}
