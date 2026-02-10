"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from "next-themes";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.css"; // Ensure CSS is imported for formula rendering

interface StudyMaterialFormProps {
    initialData?: {
        title?: string;
        content?: string;
        type?: string;
        url?: string;
        is_published?: boolean;
    };
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isLoading?: boolean;
    mode?: 'default' | 'reading';
}

export default function StudyMaterialForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
    mode = 'default' // 'reading' mode hides title/type
}: StudyMaterialFormProps) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [type, setType] = useState(initialData?.type || "note");
    const [url, setUrl] = useState(initialData?.url || "");
    const [isPublished, setIsPublished] = useState(initialData?.is_published ?? true);

    const { theme } = useTheme();

    useEffect(() => {
        if (mode === 'reading' && !initialData?.type) {
            setType('reading');
        }
    }, [mode, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalTitle = title;
        if (mode === 'reading' && !finalTitle.trim()) {
            finalTitle = "Reading Material"; // Fallback title since DB requires it
        }

        onSubmit({
            title: finalTitle,
            content: content || null,
            type: mode === 'reading' ? 'reading' : type,
            url: url || null,
            is_published: isPublished,
        });
    };

    const isReadingMode = mode === 'reading';

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">

            <div className="flex items-center justify-between gap-4 shrink-0">
                {!isReadingMode ? (
                    <>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="mat-title">Title *</Label>
                                <Input
                                    id="mat-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Topic Overview"
                                    required={!isReadingMode}
                                    className="h-9"
                                />
                            </div>

                            {/* Type */}
                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="note">📝 Note</SelectItem>
                                        <SelectItem value="reading">📖 Reading</SelectItem>
                                        <SelectItem value="link">🔗 Link</SelectItem>
                                        <SelectItem value="video">🎥 Video</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-muted-foreground italic">
                        Editing Reading Content
                    </div>
                )}

                {/* Published */}
                <div className="flex items-center gap-2 pt-1">
                    <Label className="cursor-pointer text-sm" htmlFor="published">Published</Label>
                    <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
            </div>

            {/* URL (for link/video) - only show if not reading mode (assuming reading mode is pure md) */}
            {!isReadingMode && (type === 'link' || type === 'video') && (
                <div className="space-y-1.5 shrink-0">
                    <Label htmlFor="mat-url">URL *</Label>
                    <Input
                        id="mat-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                        required
                        className="h-9"
                    />
                </div>
            )}

            {/* Markdown Editor */}
            <div className="flex-1 min-h-0 flex flex-col gap-1.5" data-color-mode={theme === 'dark' ? 'dark' : 'light'}>
                <Label>{isReadingMode ? 'Content' : 'Description / Content'}</Label>
                <div className="flex-1 min-h-0 border rounded-md overflow-hidden relative">
                    <MDEditor
                        value={content}
                        onChange={(val) => setContent(val || '')}
                        height="100%"
                        preview="edit"
                        hideToolbar={false}
                        enableScroll={true}
                        previewOptions={{
                            rehypePlugins: [[rehypeKatex]],
                            remarkPlugins: [[remarkMath]],
                        }}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground text-right px-1">
                    Supports Markdown & LaTeX (use $...$ for equations)
                </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 shrink-0">
                <Button type="button" variant="outline" onClick={onCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
                <Button type="submit" disabled={(!isReadingMode && !title) || isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    {initialData ? 'Update' : 'Add Content'}
                </Button>
            </div>
        </form>
    );
}
