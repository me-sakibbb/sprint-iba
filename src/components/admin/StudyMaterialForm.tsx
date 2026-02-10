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
import { Save, X } from "lucide-react";

interface StudyMaterialFormProps {
    initialData?: {
        title: string;
        content: string;
        type: string;
        url: string;
        is_published: boolean;
    };
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function StudyMaterialForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: StudyMaterialFormProps) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [type, setType] = useState(initialData?.type || "note");
    const [url, setUrl] = useState(initialData?.url || "");
    const [isPublished, setIsPublished] = useState(initialData?.is_published ?? true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            content: content || null,
            type,
            url: url || null,
            is_published: isPublished,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="mat-title">Title *</Label>
                <Input
                    id="mat-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Subject-Verb Agreement Rules"
                    required
                />
            </div>

            {/* Type */}
            <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="note">📝 Note</SelectItem>
                        <SelectItem value="reading">📖 Reading</SelectItem>
                        <SelectItem value="link">🔗 External Link</SelectItem>
                        <SelectItem value="video">🎥 Video</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* URL (for link/video) */}
            {(type === 'link' || type === 'video') && (
                <div className="space-y-2">
                    <Label htmlFor="mat-url">URL *</Label>
                    <Input
                        id="mat-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                        required
                    />
                </div>
            )}

            {/* Content (Markdown) */}
            <div className="space-y-2">
                <Label htmlFor="mat-content">Content (Markdown)</Label>
                <Textarea
                    id="mat-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your notes here in Markdown format..."
                    rows={12}
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Supports Markdown formatting. Use **bold**, *italic*, # headings, - lists, etc.
                </p>
            </div>

            {/* Published */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div>
                    <Label>Published</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Unpublished materials are hidden from students
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
                    {initialData ? 'Update Material' : 'Add Material'}
                </Button>
            </div>
        </form>
    );
}
