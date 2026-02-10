"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    BookOpen, FileText, Link2, Video, ExternalLink,
    CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/MarkdownText";
import type { Tables } from "@/integrations/supabase/types";

type StudyMaterial = Tables<'study_materials'>;

const typeIcons: Record<string, any> = {
    note: FileText,
    reading: BookOpen,
    link: Link2,
    video: Video,
};

const typeLabels: Record<string, string> = {
    note: "Note",
    reading: "Reading",
    link: "External Link",
    video: "Video",
};

const typeColors: Record<string, string> = {
    note: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    reading: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    link: "bg-green-500/10 text-green-600 border-green-500/20",
    video: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface StudyMaterialViewerProps {
    materials: StudyMaterial[];
    readMaterials: string[];
    onMarkRead: (materialId: string) => void;
    filterType?: string;
}

export default function StudyMaterialViewer({
    materials,
    readMaterials,
    onMarkRead,
    filterType,
}: StudyMaterialViewerProps) {
    const [expandedId, setExpandedId] = useState<string | null>(
        materials.length > 0 ? materials[0].id : null
    );

    const filtered = filterType
        ? materials.filter(m => m.type === filterType)
        : materials;

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-1">No materials yet</h3>
                <p className="text-sm text-muted-foreground/70">
                    Materials will appear here once added by an admin.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {filtered.map((material, index) => {
                const isRead = readMaterials.includes(material.id);
                const isExpanded = expandedId === material.id;
                const IconComponent = typeIcons[material.type] || FileText;

                return (
                    <Card
                        key={material.id}
                        className={cn(
                            "border-border/40 transition-all duration-200",
                            isRead && "bg-muted/30 border-green-500/20",
                            isExpanded && "shadow-md"
                        )}
                    >
                        {/* Header - always visible */}
                        <div
                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg"
                            onClick={() => setExpandedId(isExpanded ? null : material.id)}
                        >
                            <Checkbox
                                checked={isRead}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isRead) onMarkRead(material.id);
                                }}
                                className={cn(
                                    "transition-all",
                                    isRead && "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                )}
                            />

                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                typeColors[material.type]
                            )}>
                                <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={cn(
                                        "font-medium truncate",
                                        isRead && "text-muted-foreground line-through"
                                    )}>
                                        {material.title}
                                    </h4>
                                    {isRead && (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeColors[material.type])}>
                                        {typeLabels[material.type]}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        #{index + 1}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {material.url && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(material.url!, '_blank');
                                        }}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                )}
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                            <CardContent className="pt-0 pb-5 px-5 border-t border-border/30">
                                {/* Video embed */}
                                {material.type === 'video' && material.url && (
                                    <div className="mb-4 rounded-lg overflow-hidden bg-black aspect-video">
                                        <iframe
                                            src={material.url.replace('watch?v=', 'embed/')}
                                            className="w-full h-full"
                                            allowFullScreen
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        />
                                    </div>
                                )}

                                {/* Link preview */}
                                {material.type === 'link' && material.url && (
                                    <div className="mb-4 p-3 rounded-lg bg-accent/30 border border-border/50 flex items-center gap-3">
                                        <Link2 className="w-5 h-5 text-primary shrink-0" />
                                        <a
                                            href={material.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline truncate"
                                        >
                                            {material.url}
                                        </a>
                                    </div>
                                )}

                                {/* Markdown content */}
                                {material.content && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <MarkdownText text={material.content} />
                                    </div>
                                )}

                                {/* Mark as read button */}
                                {!isRead && (
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                                            onClick={() => onMarkRead(material.id)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Mark as Read
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
