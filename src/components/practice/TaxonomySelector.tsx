"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TaxonomyItem {
    id: string;
    title: string;
    parent_id: string | null;
    children: TaxonomyItem[];
}

interface TaxonomySelectorProps {
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

export function TaxonomySelector({ selectedIds, onSelectionChange }: TaxonomySelectorProps) {
    const [items, setItems] = useState<TaxonomyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchTaxonomy() {
            setLoading(true);
            const { data, error } = await supabase
                .from('study_topics')
                .select('id, title, parent_id')
                .eq('is_published', true)
                .order('title');

            if (error) {
                console.error('Error fetching taxonomy:', error);
                setLoading(false);
                return;
            }

            // Build tree
            const itemMap = new Map<string, TaxonomyItem>();
            const roots: TaxonomyItem[] = [];

            // Initialize items
            data?.forEach(row => {
                itemMap.set(row.id, { ...row, children: [] });
            });

            // Build hierarchy
            data?.forEach(row => {
                const item = itemMap.get(row.id)!;
                if (row.parent_id) {
                    const parent = itemMap.get(row.parent_id);
                    if (parent) {
                        parent.children.push(item);
                    } else {
                        // Orphaned or parent not published? Treat as root? No, ignore or root.
                        // roots.push(item); 
                    }
                } else {
                    roots.push(item);
                }
            });

            setItems(roots);
            setLoading(false);
        }

        fetchTaxonomy();
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getAllDescendantIds = (item: TaxonomyItem): string[] => {
        let ids = [item.id];
        for (const child of item.children) {
            ids = [...ids, ...getAllDescendantIds(child)];
        }
        return ids;
    };

    const handleSelect = (item: TaxonomyItem | 'Overall', isSelected: boolean) => {
        if (item === 'Overall') {
            if (isSelected) {
                // Select Overall clears specific selections? Or sets special 'Overall' ID?
                // Plan said: "Overall selects everything"
                // Implementation: pass 'Overall' as the only ID.
                onSelectionChange(['Overall']);
            } else {
                onSelectionChange([]);
            }
            return;
        }

        let newSelectedIds = [...selectedIds];

        // If Overall was selected, clear it first
        if (newSelectedIds.includes('Overall')) {
            newSelectedIds = [];
        }

        const descendantIds = getAllDescendantIds(item);

        if (isSelected) {
            // Add item and all descendants
            // Also need to handle "Select Parent if all children selected" logic? 
            // For now, simpler: just add IDs.
            // If we select a subject, we select the subject ID and all topic IDs?
            // Yes, so the query matches any of them.

            // Add unique
            const toAdd = descendantIds.filter(id => !newSelectedIds.includes(id));
            newSelectedIds = [...newSelectedIds, ...toAdd];
        } else {
            // Remove item and all descendants
            newSelectedIds = newSelectedIds.filter(id => !descendantIds.includes(id));
        }

        onSelectionChange(newSelectedIds);
    };

    const isSelected = (id: string) => {
        return selectedIds.includes('Overall') || selectedIds.includes(id);
    };

    // Sort items alphabetically
    const sortedItems = useMemo(() => {
        const sortNodes = (nodes: TaxonomyItem[]): TaxonomyItem[] => {
            return nodes.sort((a, b) => a.title.localeCompare(b.title)).map(node => ({
                ...node,
                children: sortNodes(node.children)
            }));
        };
        return sortNodes(items);
    }, [items]);


    const renderTree = (nodes: TaxonomyItem[], level = 0) => {
        return nodes.map(node => {
            const isNodeSelected = isSelected(node.id);
            const isExpanded = expandedIds.has(node.id);
            const hasChildren = node.children.length > 0;

            return (
                <div key={node.id} className="select-none">
                    <div
                        className={`flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors ${level > 0 ? 'ml-6 border-l' : ''}`}
                    >
                        {hasChildren ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                                className="p-1 hover:bg-muted rounded-sm text-muted-foreground"
                            >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <div className="w-6" /> // Spacer
                        )}

                        <Checkbox
                            id={`node-${node.id}`}
                            checked={isNodeSelected}
                            onCheckedChange={(checked) => handleSelect(node, checked as boolean)}
                            disabled={selectedIds.includes('Overall')}
                        />

                        <label
                            htmlFor={`node-${node.id}`}
                            className="flex-1 cursor-pointer text-sm font-medium py-1"
                        >
                            {node.title}
                        </label>

                        {hasChildren && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">
                                {node.children.length}
                            </Badge>
                        )}
                    </div>

                    {isExpanded && hasChildren && (
                        <div className="mt-1">
                            {renderTree(node.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-2">
            <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedIds.includes('Overall')
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                    }`}
                onClick={() => handleSelect('Overall', !selectedIds.includes('Overall'))}
            >
                <Checkbox checked={selectedIds.includes('Overall')} />
                <div className="flex-1">
                    <div className="font-semibold">Overall</div>
                    <div className="text-sm text-muted-foreground">All subjects and topics</div>
                </div>
            </div>

            <ScrollArea className="h-[400px] pr-4 border rounded-md p-2">
                {renderTree(sortedItems)}
            </ScrollArea>
        </div>
    );
}

