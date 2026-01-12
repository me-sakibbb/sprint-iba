"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X, Filter } from "lucide-react";
import type { MistakeFilters } from "@/hooks/useMistakes";

interface MistakeFiltersProps {
    topics: string[];
    onFiltersChange: (filters: MistakeFilters) => void;
}

const severityLevels = [
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low', color: 'bg-blue-500' },
];

const dateRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
];

export default function MistakeFiltersPanel({ topics, onFiltersChange }: MistakeFiltersProps) {
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState('all');

    // Update filters when selections change
    useEffect(() => {
        const filters: MistakeFilters = {};

        if (selectedTopics.length > 0) {
            filters.topics = selectedTopics;
        }

        if (selectedSeverities.length > 0) {
            filters.severityLevels = selectedSeverities;
        }

        if (dateRange !== 'all') {
            const days = parseInt(dateRange);
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - days);
            filters.dateRange = { start, end };
        }

        onFiltersChange(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTopics, selectedSeverities, dateRange]);

    const toggleTopic = (topic: string) => {
        setSelectedTopics(prev =>
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    const toggleSeverity = (severity: string) => {
        setSelectedSeverities(prev =>
            prev.includes(severity)
                ? prev.filter(s => s !== severity)
                : [...prev, severity]
        );
    };

    const clearAllFilters = () => {
        setSelectedTopics([]);
        setSelectedSeverities([]);
        setDateRange('all');
    };

    const activeFilterCount = selectedTopics.length + selectedSeverities.length + (dateRange !== 'all' ? 1 : 0);

    return (
        <Card className="border-border/40">
            <CardContent className="p-5">
                <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-lg">Filters</h3>
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </div>
                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Clear all
                            </Button>
                        )}
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                        <Label>Time Period</Label>
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {dateRangeOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Severity Level */}
                    <div className="space-y-3">
                        <Label>Severity Level</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {severityLevels.map(level => {
                                const isSelected = selectedSeverities.includes(level.value);
                                return (
                                    <div
                                        key={level.value}
                                        onClick={() => toggleSeverity(level.value)}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <Checkbox checked={isSelected} className="pointer-events-none" />
                                        <div className={`w-3 h-3 rounded-full ${level.color}`} />
                                        <span className="text-sm font-medium">{level.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Topics */}
                    {topics.length > 0 && (
                        <div className="space-y-3">
                            <Label>Topics</Label>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                                {topics.map(topic => {
                                    const isSelected = selectedTopics.includes(topic);
                                    return (
                                        <div
                                            key={topic}
                                            onClick={() => toggleTopic(topic)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer ${isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent hover:bg-muted'
                                                }`}
                                        >
                                            <Checkbox checked={isSelected} className="pointer-events-none" />
                                            <span className="text-sm flex-1 text-left">{topic}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
