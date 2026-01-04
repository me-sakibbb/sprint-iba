"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    Search,
    Plus,
    X,
    Shuffle,
    GripVertical
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Exam {
    id: string;
    title: string;
    description: string | null;
    type: 'mock' | 'live';
    question_ids: string[];
    duration_minutes: number;
    start_time: string | null;
    end_time: string | null;
    allow_retake: boolean;
    show_results_immediately: boolean;
    show_leaderboard: boolean;
    show_topic_breakdown: boolean;
    is_published: boolean;
}

interface Question {
    id: string;
    question_text: string;
    topic: string | null;
    subtopic: string | null;
    difficulty: string | null;
}

interface ExamEditorProps {
    exam: Exam | null;
    onSave: () => void;
    onCancel: () => void;
}

export default function ExamEditor({ exam, onSave, onCancel }: ExamEditorProps) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTopic, setFilterTopic] = useState<string>('all');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

    // Form state
    const [title, setTitle] = useState(exam?.title || '');
    const [description, setDescription] = useState(exam?.description || '');
    const [type, setType] = useState<'mock' | 'live'>(exam?.type || 'mock');
    const [durationMinutes, setDurationMinutes] = useState(exam?.duration_minutes || 60);
    const [startTime, setStartTime] = useState(exam?.start_time?.slice(0, 16) || '');
    const [endTime, setEndTime] = useState(exam?.end_time?.slice(0, 16) || '');
    const [allowRetake, setAllowRetake] = useState(exam?.allow_retake ?? false);
    const [showResultsImmediately, setShowResultsImmediately] = useState(exam?.show_results_immediately ?? true);
    const [showLeaderboard, setShowLeaderboard] = useState(exam?.show_leaderboard ?? true);
    const [showTopicBreakdown, setShowTopicBreakdown] = useState(exam?.show_topic_breakdown ?? true);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(exam?.question_ids || []);

    // Auto-generate settings
    const [autoGenerate, setAutoGenerate] = useState(false);
    const [autoCount, setAutoCount] = useState(20);
    const [autoTopics, setAutoTopics] = useState<string[]>([]);

    useEffect(() => {
        async function fetchQuestions() {
            const { data, error } = await supabase
                .from('questions')
                .select('id, question_text, topic, subtopic, difficulty')
                .eq('is_verified', true)
                .order('created_at', { ascending: false });

            if (error) {
                toast.error("Failed to fetch questions");
                return;
            }

            setQuestions((data || []) as Question[]);
            setLoadingQuestions(false);
        }

        fetchQuestions();
    }, []);

    const topics = Array.from(new Set(questions.map(q => q.topic).filter(Boolean))) as string[];

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTopic = filterTopic === 'all' || q.topic === filterTopic;
        const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
        return matchesSearch && matchesTopic && matchesDifficulty;
    });

    const toggleQuestion = (id: string) => {
        setSelectedQuestionIds(prev =>
            prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
        );
    };

    const handleAutoGenerate = () => {
        let pool = questions;

        if (autoTopics.length > 0) {
            pool = pool.filter(q => autoTopics.includes(q.topic || ''));
        }

        // Shuffle and select
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, autoCount).map(q => q.id);
        setSelectedQuestionIds(selected);
        toast.success(`Selected ${selected.length} questions`);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        if (selectedQuestionIds.length === 0) {
            toast.error("Please select at least one question");
            return;
        }

        setSaving(true);
        try {
            const examData = {
                title,
                description: description || null,
                type,
                question_ids: selectedQuestionIds,
                duration_minutes: durationMinutes,
                start_time: type === 'live' && startTime ? new Date(startTime).toISOString() : null,
                end_time: type === 'live' && endTime ? new Date(endTime).toISOString() : null,
                allow_retake: allowRetake,
                show_results_immediately: showResultsImmediately,
                show_leaderboard: showLeaderboard,
                show_topic_breakdown: showTopicBreakdown,
                created_by: user?.id,
            };

            if (exam) {
                const { error } = await supabase
                    .from('exams')
                    .update(examData as any)
                    .eq('id', exam.id);

                if (error) throw error;
                toast.success("Exam updated");
            } else {
                const { error } = await supabase
                    .from('exams')
                    .insert(examData as any);

                if (error) throw error;
                toast.success("Exam created");
            }

            onSave();
        } catch (error: any) {
            toast.error(error.message || "Failed to save exam");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Exam title"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as 'mock' | 'live')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mock">Mock Exam</SelectItem>
                                <SelectItem value="live">Live Exam</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description"
                        rows={2}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                            min={1}
                        />
                    </div>
                    {type === 'live' && (
                        <>
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
                <h3 className="font-semibold">Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <Label>Allow Retakes</Label>
                        <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <Label>Show Results Immediately</Label>
                        <Switch checked={showResultsImmediately} onCheckedChange={setShowResultsImmediately} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <Label>Show Leaderboard</Label>
                        <Switch checked={showLeaderboard} onCheckedChange={setShowLeaderboard} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <Label>Show Topic Breakdown</Label>
                        <Switch checked={showTopicBreakdown} onCheckedChange={setShowTopicBreakdown} />
                    </div>
                </div>
            </div>

            {/* Question Selection */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Questions ({selectedQuestionIds.length} selected)</h3>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAutoGenerate(!autoGenerate)}>
                            <Shuffle className="w-4 h-4 mr-2" />
                            Auto-Generate
                        </Button>
                    </div>
                </div>

                {autoGenerate && (
                    <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Number of Questions</Label>
                                <Input
                                    type="number"
                                    value={autoCount}
                                    onChange={(e) => setAutoCount(parseInt(e.target.value) || 20)}
                                    min={1}
                                    max={questions.length}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Topics (optional)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {topics.map(topic => (
                                        <Badge
                                            key={topic}
                                            variant={autoTopics.includes(topic) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setAutoTopics(prev =>
                                                    prev.includes(topic)
                                                        ? prev.filter(t => t !== topic)
                                                        : [...prev, topic]
                                                );
                                            }}
                                        >
                                            {topic}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleAutoGenerate} className="w-full">
                            Generate Random Selection
                        </Button>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={filterTopic} onValueChange={setFilterTopic}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Topic" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Topics</SelectItem>
                            {topics.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Question List */}
                <ScrollArea className="h-[300px] border rounded-lg">
                    {loadingQuestions ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="p-2 space-y-2">
                            {filteredQuestions.map((q, idx) => {
                                const isSelected = selectedQuestionIds.includes(q.id);

                                return (
                                    <div
                                        key={q.id}
                                        onClick={() => toggleQuestion(q.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${isSelected
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <Checkbox checked={isSelected} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{q.question_text}</p>
                                            <div className="flex gap-2 mt-1">
                                                {q.topic && (
                                                    <Badge variant="secondary" className="text-xs">{q.topic}</Badge>
                                                )}
                                                {q.difficulty && (
                                                    <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {exam ? 'Update Exam' : 'Create Exam'}
                </Button>
            </div>
        </div>
    );
}
