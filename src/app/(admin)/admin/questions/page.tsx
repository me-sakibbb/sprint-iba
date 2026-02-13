"use client";

import { useState } from 'react';
import {
    Upload, CheckCircle, AlertCircle,
    Loader2, Trash2, ChevronDown, BrainCircuit,
    Info, Tag, MessageSquareQuote, Layers, RefreshCw, Search, Filter, Image as ImageIcon, BookOpen,
    X
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuestionExtraction, ExtractionConfig } from "@/hooks/useQuestionExtraction";
import { useQuestionFilters, Question } from "@/hooks/useQuestionFilters";
import { TokenUsageStats } from '@/components/admin/TokenUsageStats';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ManualQuestionEntry } from "@/components/admin/ManualQuestionEntry";
import { MarkdownLatexRenderer } from "@/components/admin/MarkdownLatexRenderer";
import { useTaxonomy, useSubjects, useTopics, useSubtopics } from "@/hooks/useTaxonomy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { useStorage } from "@/hooks/useStorage";

const MDEditor = dynamic(
    () => import("@uiw/react-md-editor").then((mod) => mod.default),
    { ssr: false }
);
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

export default function QuestionExtractor() {
    const { uploadFile, getPublicUrl } = useStorage();
    // Extraction state
    const [file, setFile] = useState<File | null>(null);
    const [pagesPerChunk, setPagesPerChunk] = useState(2);
    const [startPage, setStartPage] = useState<number | undefined>(undefined);
    const [endPage, setEndPage] = useState<number | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
    const [mode, setMode] = useState<'extract' | 'manual'>('extract');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Taxonomy Pre-selection State
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
    const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
    const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>("all");

    // Taxonomy hooks for pre-selection
    const { subjects: preSubjects } = useSubjects();
    const { topics: preTopics } = useTopics(selectedSubjectId !== "all" ? selectedSubjectId : undefined);
    const { subtopics: preSubtopics } = useSubtopics(selectedTopicId !== "all" ? selectedTopicId : undefined);

    const { extract, stop, progress, isProcessing } = useQuestionExtraction();
    const {
        questions,
        filters,
        loading,
        currentPage,
        totalPages,
        totalCount,
        availableTopics,
        updateFilter,
        resetFilters,
        goToPage,
        refetch,
        updateQuestionLocally,
        removeQuestionLocally,
    } = useQuestionFilters();

    // Taxonomy hooks for main filters
    const { subjects } = useSubjects();
    const { topics: mainTopics } = useTopics(filters.subject_id || undefined);
    const { subtopics: mainSubtopics } = useSubtopics(filters.topic_id || undefined);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleExtract = async () => {
        if (!file) return;

        const config: Partial<ExtractionConfig> = {
            pagesPerChunk,
            startPage: startPage || undefined,
            endPage: endPage || undefined,
        };

        // Prepare taxonomy overrides
        const taxonomyOverrides: any = {};
        if (selectedSubjectId !== "all") {
            const subject = preSubjects.find(s => s.id === selectedSubjectId);
            if (subject) taxonomyOverrides.subject = { id: subject.id, title: subject.name };
        }
        if (selectedTopicId !== "all") {
            const topic = preTopics.find(t => t.id === selectedTopicId);
            if (topic) taxonomyOverrides.topic = { id: topic.id, title: topic.name };
        }
        if (selectedSubtopicId !== "all") {
            const subtopic = preSubtopics.find(st => st.id === selectedSubtopicId);
            if (subtopic) taxonomyOverrides.subtopic = { id: subtopic.id, title: subtopic.name };
        }


        // Pass refetch as callback - UI will update after each chunk is saved
        await extract(file, config, selectedModel, refetch, taxonomyOverrides);
        setFile(null);
    };

    const handleVerify = async (q: Question) => {
        try {
            // Convert options object to array
            const optionsArray = Object.values(q.options).filter(Boolean);
            const optionsFormattedArray = q.options_formatted
                ? Object.values(q.options_formatted).filter(Boolean)
                : optionsArray;

            const { error } = await supabase
                .from('questions')
                .update({
                    question_text: q.question_text,
                    question_text_formatted: q.question_text_formatted,
                    options: optionsArray,
                    options_formatted: optionsFormattedArray,
                    correct_answer: q.correct_answer,
                    topic: q.topic,
                    subtopic: q.subtopic,
                    difficulty: q.difficulty.toLowerCase(),
                    explanation: q.explanation,
                    explanation_formatted: q.explanation_formatted,
                    subject_id: q.subject_id,
                    topic_id: q.topic_id,
                    subtopic_id: q.subtopic_id,
                    passage_id: q.passage_id,
                    image_url: q.image_url,
                    has_image: q.has_image,
                    is_verified: true
                })
                .eq('id', q.local_id);

            if (error) throw error;

            // Handle additional images
            // 1. Delete all existing images for this question (simplest sync)
            const { error: deleteError } = await supabase
                .from('question_images')
                .delete()
                .eq('question_id', q.local_id);

            if (deleteError) {
                console.error("Error deleting old images:", deleteError);
            }

            // 2. Insert current images if any
            if (q.images && q.images.length > 0) {
                const imagesToInsert = q.images.map((img, index) => ({
                    question_id: q.local_id,
                    image_url: img.image_url,
                    description: img.description || '',
                    image_order: index + 1
                }));

                const { error: insertError } = await supabase
                    .from('question_images')
                    .insert(imagesToInsert);

                if (insertError) {
                    console.error("Error inserting images:", insertError);
                    toast.error("Failed to save some images");
                }
            }

            if (error) throw error;

            toast.success("Question verified!");
            removeQuestionLocally(q.local_id);
        } catch (error: any) {
            toast.error(`Verification failed: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            removeQuestionLocally(id);
            toast.success("Question deleted");
        } catch {
            toast.error("Failed to delete question");
        }
    };

    // Bulk Actions
    const handleToggleSelect = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const ids = questions.map(q => q.local_id);
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                ids.forEach(id => newSet.add(id));
                return newSet;
            });
        } else {
            const ids = new Set(questions.map(q => q.local_id));
            setSelectedIds(prev => {
                const newSet = new Set<string>();
                prev.forEach(id => {
                    if (!ids.has(id)) newSet.add(id);
                });
                return newSet;
            });
        }
    };

    const handleBulkVerify = async () => {
        if (selectedIds.size === 0) return;
        try {
            const ids: string[] = [];
            selectedIds.forEach(id => ids.push(id));

            const { error } = await supabase
                .from('questions')
                .update({ is_verified: true })
                .in('id', ids);

            if (error) throw error;

            // Optimistically update
            ids.forEach(id => removeQuestionLocally(id));
            setSelectedIds(new Set());
            toast.success(`Verified ${selectedIds.size} questions`);
        } catch (err: any) {
            toast.error("Bulk verify failed: " + err.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} questions?`)) return;

        try {
            const ids: string[] = [];
            selectedIds.forEach(id => ids.push(id));

            const { error } = await supabase
                .from('questions')
                .delete()
                .in('id', ids);

            if (error) throw error;

            ids.forEach(id => removeQuestionLocally(id));
            setSelectedIds(new Set());
            toast.success(`Deleted ${selectedIds.size} questions`);
        } catch (err: any) {
            toast.error("Bulk delete failed: " + err.message);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        Question Extractor
                    </h1>
                    <p className="text-slate-500 mt-1">Extract MCQs from PDFs using AI</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mr-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMode('extract')}
                            className={mode === 'extract' ? 'bg-white shadow-sm' : ''}
                        >
                            AI Extraction
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMode('manual')}
                            className={mode === 'manual' ? 'bg-white shadow-sm' : ''}
                        >
                            Manual Entry
                        </Button>
                    </div>
                    <Button variant="outline" onClick={refetch} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Token Usage Stats */}
            <TokenUsageStats />

            {/* Upload Section / Manual Entry */}
            {mode === 'extract' ? (
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-900">Extraction Settings</h3>

                                {/* File Upload */}
                                <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center transition-all cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-8 h-8 mx-auto text-slate-300 group-hover:text-indigo-500 mb-2" />
                                    <p className="text-sm font-bold text-slate-600 truncate">
                                        {file ? file.name : "Click or drag PDF"}
                                    </p>
                                </div>

                                {file && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="model">AI Model</Label>
                                                <Select value={selectedModel} onValueChange={setSelectedModel}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select model" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</SelectItem>
                                                        <SelectItem value="gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite (Preview)</SelectItem>
                                                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</SelectItem>
                                                        <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</SelectItem>
                                                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Best Quality)</SelectItem>
                                                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="chunkSize">Pages/Chunk</Label>
                                                <Input
                                                    id="chunkSize"
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={pagesPerChunk}
                                                    onChange={e => setPagesPerChunk(parseInt(e.target.value) || 5)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="startPage">Start Page</Label>
                                                <Input
                                                    id="startPage"
                                                    type="number"
                                                    min={1}
                                                    placeholder="1"
                                                    value={startPage || ''}
                                                    onChange={e => setStartPage(parseInt(e.target.value) || undefined)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="endPage">End Page</Label>
                                                <Input
                                                    id="endPage"
                                                    type="number"
                                                    min={1}
                                                    placeholder="All"
                                                    value={endPage || ''}
                                                    onChange={e => setEndPage(parseInt(e.target.value) || undefined)}
                                                />
                                            </div>
                                        </div>

                                        {/* Taxonomy Pre-selection */}
                                        <div className="space-y-4 pt-2 border-t border-slate-100 mt-4">
                                            <Label className="text-slate-900 font-semibold block mb-2">Pre-assign Taxonomy (Optional)</Label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="extract-subject" className="text-xs text-slate-500">Subject</Label>
                                                    <Select value={selectedSubjectId} onValueChange={(val) => {
                                                        setSelectedSubjectId(val);
                                                        setSelectedTopicId("all");
                                                        setSelectedSubtopicId("all");
                                                    }}>
                                                        <SelectTrigger id="extract-subject">
                                                            <SelectValue placeholder="Auto-detect" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Auto-detect</SelectItem>
                                                            {preSubjects.map(s => (
                                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="extract-topic" className="text-xs text-slate-500">Topic</Label>
                                                    <Select
                                                        value={selectedTopicId}
                                                        onValueChange={(val) => {
                                                            setSelectedTopicId(val);
                                                            setSelectedSubtopicId("all");
                                                        }}
                                                        disabled={selectedSubjectId === "all"}
                                                    >
                                                        <SelectTrigger id="extract-topic">
                                                            <SelectValue placeholder="Auto-detect" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Auto-detect</SelectItem>
                                                            {preTopics.map(t => (
                                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="extract-subtopic" className="text-xs text-slate-500">Subtopic</Label>
                                                    <Select
                                                        value={selectedSubtopicId}
                                                        onValueChange={setSelectedSubtopicId}
                                                        disabled={selectedTopicId === "all"}
                                                    >
                                                        <SelectTrigger id="extract-subtopic">
                                                            <SelectValue placeholder="Auto-detect" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Auto-detect</SelectItem>
                                                            {preSubtopics.map(st => (
                                                                <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                *If selected, extracted questions will be forced into these categories. Leave as "Auto-detect" to let AI decide.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Extract Button */}
                                {isProcessing ? (
                                    <div className="flex gap-2">
                                        <Button disabled className="flex-1">
                                            <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                            Processing...
                                        </Button>
                                        <Button variant="destructive" onClick={stop}>Stop</Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleExtract}
                                        disabled={!file}
                                        className="w-full bg-slate-900 hover:bg-slate-800"
                                    >
                                        <BrainCircuit className="w-4 h-4 mr-2" />
                                        Start Extraction
                                    </Button>
                                )}
                            </div>

                            {/* Right: Progress & Info */}
                            <div className="space-y-4">
                                {progress.step !== 'idle' && (
                                    <div className={`rounded-xl p-4 border ${progress.step === 'error' ? 'bg-rose-50 border-rose-200' :
                                        progress.step === 'complete' ? 'bg-emerald-50 border-emerald-200' :
                                            'bg-blue-50 border-blue-200'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {progress.step === 'complete' ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                            ) : progress.step === 'error' ? (
                                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                            ) : (
                                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                            )}
                                            <span className="font-bold text-sm capitalize">{progress.step}</span>
                                        </div>
                                        <p className="text-xs text-slate-600">{progress.detail}</p>
                                        {progress.currentChunk && progress.totalChunks && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Chunk {progress.currentChunk}/{progress.totalChunks}
                                            </p>
                                        )}
                                        {progress.tokens && (
                                            <p className="text-xs font-mono text-slate-500 mt-2">
                                                Tokens: {progress.tokens.total.toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-indigo-600" /> How it works
                                    </h4>
                                    <ul className="space-y-2 text-xs text-slate-600">
                                        <li className="flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold">1</span>
                                            Upload PDF with MCQs
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold">2</span>
                                            AI extracts & solves questions
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold">3</span>
                                            Review, edit, and verify
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <ManualQuestionEntry onQuestionAdded={refetch} />
            )
            }

            {/* Filters Section */}
            <Card className="border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search questions..."
                                    value={filters.search}
                                    onChange={e => updateFilter('search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Verification Status */}
                        <Select
                            value={filters.verificationStatus}
                            onValueChange={(v: any) => updateFilter('verificationStatus', v)}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="unverified">Unverified</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Subject Filter */}
                        <Select
                            value={filters.subject_id || 'all'}
                            onValueChange={v => {
                                updateFilter('subject_id', v === 'all' ? '' : v);
                                updateFilter('topic_id', '');
                                updateFilter('subtopic_id', '');
                            }}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Topic Filter (Taxonomy) */}
                        <Select
                            value={filters.topic_id || 'all'}
                            onValueChange={v => {
                                updateFilter('topic_id', v === 'all' ? '' : v);
                                updateFilter('subtopic_id', '');
                            }}
                            disabled={!filters.subject_id}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Topic" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Topics</SelectItem>
                                {mainTopics.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Subtopic Filter (Taxonomy) */}
                        <Select
                            value={filters.subtopic_id || 'all'}
                            onValueChange={v => updateFilter('subtopic_id', v === 'all' ? '' : v)}
                            disabled={!filters.topic_id}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Subtopic" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subtopics</SelectItem>
                                {mainSubtopics.map(st => (
                                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Legacy Topic Filter (Hidden if taxonomy is used) */}
                        {!filters.subject_id && (
                            <Select
                                value={filters.topic || 'all'}
                                onValueChange={v => updateFilter('topic', v === 'all' ? '' : v)}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Legacy Topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Legacy Topics</SelectItem>
                                    {availableTopics.map(topic => (
                                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Difficulty Filter */}
                        <Select
                            value={filters.difficulty}
                            onValueChange={(v: any) => updateFilter('difficulty', v)}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Items per page */}
                        <Select
                            value={filters.itemsPerPage.toString()}
                            onValueChange={v => updateFilter('itemsPerPage', parseInt(v))}
                        >
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Reset */}
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                            <Filter className="w-4 h-4 mr-1" />
                            Reset
                        </Button>

                        {/* Count */}
                        <Badge variant="secondary" className="ml-auto">
                            {totalCount} questions
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 items-center">
                    <span className="font-bold text-sm">{selectedIds.size} selected</span>
                    <div className="h-4 w-px bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:text-white hover:bg-slate-800 h-8"
                            onClick={handleBulkVerify}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve All
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-400 hover:text-rose-300 hover:bg-slate-800 h-8"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete All
                        </Button>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-full hover:bg-slate-800 ml-2"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        <span className="sr-only">Clear selection</span>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Questions List Header with Select All */}
            {questions.length > 0 && (
                <div className="flex items-center gap-2 px-2">
                    <Checkbox
                        checked={questions.length > 0 && questions.every(q => selectedIds.has(q.local_id))}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <Label className="text-sm font-medium text-slate-600 cursor-pointer" onClick={() => handleSelectAll(!(questions.length > 0 && questions.every(q => selectedIds.has(q.local_id))))}>
                        Select All on Page
                    </Label>
                </div>
            )}

            {/* Questions List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        No questions found
                    </div>
                ) : (

                    (() => {
                        // Group questions by passage_id
                        const passageGroups: Record<string, Question[]> = {};
                        const standaloneQuestions: Question[] = [];

                        questions.forEach(q => {
                            if (q.passage_id) {
                                if (!passageGroups[q.passage_id]) {
                                    passageGroups[q.passage_id] = [];
                                }
                                passageGroups[q.passage_id].push(q);
                            } else {
                                standaloneQuestions.push(q);
                            }
                        });


                        const renderedPassageIds = new Set<string>();

                        return questions.map((q, idx) => {
                            // If this question is part of a passage
                            if (q.passage_id) {
                                // If we haven't rendered this passage group yet
                                if (!renderedPassageIds.has(q.passage_id)) {
                                    renderedPassageIds.add(q.passage_id);
                                    const group = passageGroups[q.passage_id];
                                    return (
                                        <PassageGroup
                                            key={q.passage_id}
                                            passageId={q.passage_id}
                                            passageContent={q.passage_content}
                                            passageImage={q.passage_image}
                                            questions={group}
                                            startIndex={(currentPage - 1) * filters.itemsPerPage + idx}
                                            onDelete={handleDelete}
                                            onUpdate={updateQuestionLocally}
                                            onVerify={handleVerify}
                                            selectedIds={selectedIds}
                                            onToggleSelect={handleToggleSelect}
                                        />
                                    );
                                }
                                // If already rendered (packaged in the group above), return null
                                return null;
                            }

                            // Standalone question
                            return (
                                <QuestionCard
                                    key={q.local_id}
                                    q={q}
                                    idx={(currentPage - 1) * filters.itemsPerPage + idx}
                                    onDelete={handleDelete}
                                    onUpdate={updateQuestionLocally}
                                    onVerify={() => handleVerify(q)}
                                    isSelected={selectedIds.has(q.local_id)}
                                    onToggleSelect={handleToggleSelect}
                                />
                            );
                        });
                    })()
                )}



                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div >
    );
}

// --- Question Card Component ---
function QuestionCard({
    q,
    idx,
    onDelete,
    onUpdate,
    onVerify,
    isSelected,
    onToggleSelect
}: {
    q: Question;
    idx: number;
    onDelete: (id: string) => void;
    onUpdate: (id: string, key: string, value: any) => void;
    onVerify: () => void;
    isSelected?: boolean;
    onToggleSelect?: (id: string, checked: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("edit");

    // Taxonomy hooks
    const { subjects } = useSubjects();
    const { topics } = useTopics(q.subject_id || undefined);
    const { subtopics } = useSubtopics(q.topic_id || undefined);

    // Update taxonomy helpers
    const handleSubjectChange = (subjectId: string) => {
        onUpdate(q.local_id, 'subject_id', subjectId);
        onUpdate(q.local_id, 'topic_id', null);
        onUpdate(q.local_id, 'subtopic_id', null);
    };

    const handleTopicChange = (topicId: string) => {
        const topic = topics.find(t => t.id === topicId);
        onUpdate(q.local_id, 'topic_id', topicId);
        onUpdate(q.local_id, 'subtopic_id', null);
        if (topic) onUpdate(q.local_id, 'topic', topic.name);
    };

    const handleSubtopicChange = (subtopicId: string) => {
        const subtopic = subtopics.find(s => s.id === subtopicId);
        onUpdate(q.local_id, 'subtopic_id', subtopicId);
        if (subtopic) onUpdate(q.local_id, 'subtopic', subtopic.name);
    };

    return (
        <Card className={`transition-all ${open ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <div
                className="p-4 flex items-center gap-4 select-none"
            >
                {onToggleSelect && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onToggleSelect(q.local_id, checked as boolean)}
                            className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                    </div>
                )}
                <div
                    className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 border shrink-0 cursor-pointer"
                    onClick={() => setOpen(!open)}
                >
                    {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                            <MarkdownLatexRenderer
                                content={q.question_text_formatted || q.question_text || "Empty Question"}
                                className="inline-block"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <Badge variant="secondary" className="text-[10px] font-bold text-indigo-600 bg-indigo-50">
                            {q.topic || 'No Topic'}
                        </Badge>
                        {q.subtopic && (
                            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                                {q.subtopic}
                            </Badge>
                        )}
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{q.difficulty}</span>
                        {(q.has_image || (q.images && q.images.length > 0)) && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <ImageIcon className="w-3 h-3 text-amber-500" />
                            </>
                        )}
                        {q.is_verified && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <CardContent className="pt-0 border-t border-slate-50 space-y-6">
                    {/* Image Display */}
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon className="w-3 h-3" /> Question Images
                            </Label>
                            <div>
                                <input
                                    type="file"
                                    id={`upload-${q.local_id}`}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        try {
                                            toast.info("Uploading image...");
                                            const fileName = `manual_upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                                            const path = await uploadFile('question-images', file, fileName);

                                            if (!path) {
                                                toast.error("Failed to upload image");
                                                return;
                                            }

                                            const imageUrl = getPublicUrl('question-images', path);

                                            // If no main image, set as main
                                            if (!q.image_url) {
                                                onUpdate(q.local_id, 'image_url', imageUrl);
                                                onUpdate(q.local_id, 'has_image', true);
                                                toast.success("Main image added");
                                            } else {
                                                // Add to additional images
                                                const newImage = {
                                                    id: crypto.randomUUID(),
                                                    image_url: imageUrl,
                                                    description: '',
                                                    image_order: (q.images?.length || 0) + 1
                                                };
                                                onUpdate(q.local_id, 'images', [...(q.images || []), newImage]);
                                                toast.success("Additional image added");
                                            }
                                        } catch (error: any) {
                                            toast.error(`Upload failed: ${error.message}`);
                                        }
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => document.getElementById(`upload-${q.local_id}`)?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1" />
                                    Add Image
                                </Button>
                            </div>
                        </div>

                        {/* Main Image */}
                        {q.image_url && (
                            <div className="space-y-2 relative group">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Main Image
                                </Label>
                                <div className="relative inline-block">
                                    <img
                                        src={q.image_url}
                                        alt="Question image"
                                        className="max-h-64 rounded-lg border border-slate-200 object-contain bg-slate-50"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            onUpdate(q.local_id, 'image_url', null);
                                            // If no additional images, set has_image to false
                                            if (!q.images || q.images.length === 0) {
                                                onUpdate(q.local_id, 'has_image', false);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Additional Images */}
                        {q.images && q.images.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.images.map((img, i) => (
                                    <div key={img.id || i} className="space-y-2 relative group">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            Image {i + 1} {img.description && `- ${img.description}`}
                                        </Label>
                                        <div className="relative inline-block">
                                            <img
                                                src={img.image_url}
                                                alt={`Extra image ${i + 1}`}
                                                className="max-h-48 rounded-lg border border-slate-200 object-contain bg-slate-50"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    const newImages = q.images?.filter((_, index) => index !== i);
                                                    onUpdate(q.local_id, 'images', newImages);
                                                    if (!q.image_url && (!newImages || newImages.length === 0)) {
                                                        onUpdate(q.local_id, 'has_image', false);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList className="grid w-[200px] grid-cols-2">
                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>

                            {/* Taxonomy Selectors */}
                            <div className="flex gap-2">
                                <Select value={q.subject_id || "unassigned"} onValueChange={(v: string) => handleSubjectChange(v === "unassigned" ? "" : v)}>
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue placeholder="Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Select Subject</SelectItem>
                                        {subjects.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={q.topic_id || "unassigned"} onValueChange={(v: string) => handleTopicChange(v === "unassigned" ? "" : v)} disabled={!q.subject_id}>
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue placeholder="Topic" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Select Topic</SelectItem>
                                        {topics.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={q.subtopic_id || "unassigned"} onValueChange={(v: string) => handleSubtopicChange(v === "unassigned" ? "" : v)} disabled={!q.topic_id}>
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue placeholder="Subtopic" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Select Subtopic</SelectItem>
                                        {subtopics.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <TabsContent value="edit" className="space-y-6">
                            {/* Question Text */}
                            <div className="space-y-2" data-color-mode="light">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquareQuote className="w-3 h-3" /> Question Text (Markdown/LaTeX supported)
                                </Label>
                                <MDEditor
                                    value={q.question_text_formatted || q.question_text}
                                    onChange={val => {
                                        onUpdate(q.local_id, 'question_text_formatted', val || '');
                                        onUpdate(q.local_id, 'question_text', val || '');
                                    }}
                                    preview="edit"
                                    height={200}
                                    className="mt-2"
                                />
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options</Label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const keys = Object.keys(q.options);
                                                const labels = ['A', 'B', 'C', 'D', 'E'];
                                                const nextLabel = labels[keys.length];
                                                if (nextLabel && keys.length < 5) {
                                                    onUpdate(q.local_id, 'options', { ...q.options, [nextLabel]: '' });
                                                    if (q.options_formatted) {
                                                        onUpdate(q.local_id, 'options_formatted', { ...q.options_formatted, [nextLabel]: '' });
                                                    }
                                                }
                                            }}
                                            disabled={Object.keys(q.options).length >= 5}
                                            className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                                        >
                                            + Add Option
                                        </button>
                                        <button
                                            onClick={() => {
                                                const keys = Object.keys(q.options);
                                                if (keys.length > 2) {
                                                    const newOptions = { ...q.options };
                                                    delete newOptions[keys[keys.length - 1]];
                                                    onUpdate(q.local_id, 'options', newOptions);

                                                    if (q.options_formatted) {
                                                        const newFormatted = { ...q.options_formatted };
                                                        delete newFormatted[keys[keys.length - 1]];
                                                        onUpdate(q.local_id, 'options_formatted', newFormatted);
                                                    }
                                                }
                                            }}
                                            disabled={Object.keys(q.options).length <= 2}
                                            className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                                        >
                                            - Remove
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.keys(q.options).map(key => (
                                        <div
                                            key={key}
                                            className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${q.correct_answer === key ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <button
                                                onClick={() => onUpdate(q.local_id, 'correct_answer', key)}
                                                className={`w-7 h-7 rounded-lg text-xs font-bold border shrink-0 ${q.correct_answer === key
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-500'
                                                    }`}
                                            >
                                                {key}
                                            </button>
                                            <Textarea
                                                className="w-full bg-transparent text-sm resize-none border-0 p-0 focus-visible:ring-0 min-h-[40px] font-mono"
                                                value={q.options_formatted?.[key] || q.options[key]}
                                                onChange={e => {
                                                    onUpdate(q.local_id, 'options', { ...q.options, [key]: e.target.value });
                                                    onUpdate(q.local_id, 'options_formatted', { ...(q.options_formatted || q.options), [key]: e.target.value });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className="space-y-3" data-color-mode="light">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <BrainCircuit className="w-3 h-3" /> AI Explanation
                                </Label>
                                <MDEditor
                                    value={q.explanation_formatted || q.explanation || ''}
                                    onChange={val => {
                                        onUpdate(q.local_id, 'explanation_formatted', val || '');
                                        onUpdate(q.local_id, 'explanation', val || '');
                                    }}
                                    preview="edit"
                                    height={200}
                                    className="mt-2"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="space-y-6">
                            {/* Question Preview */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Preview</Label>
                                <div className="p-4 rounded-lg border border-slate-200 bg-white prose prose-sm max-w-none">
                                    <MarkdownLatexRenderer content={q.question_text_formatted || q.question_text} />
                                </div>
                            </div>

                            {/* Options Preview */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options Preview</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.keys(q.options).map(key => (
                                        <div
                                            key={key}
                                            className={`p-4 rounded-xl border flex items-start gap-3 ${q.correct_answer === key ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg text-xs font-bold border shrink-0 flex items-center justify-center ${q.correct_answer === key
                                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                                : 'bg-white border-slate-200 text-slate-400'
                                                }`}>
                                                {key}
                                            </div>
                                            <div className="prose prose-sm max-w-none">
                                                <MarkdownLatexRenderer content={q.options_formatted?.[key] || q.options[key]} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explanation Preview */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Explanation Preview</Label>
                                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 prose prose-sm max-w-none">
                                    <MarkdownLatexRenderer content={q.explanation_formatted || q.explanation} />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <div className="flex gap-2">
                            {['Easy', 'Medium', 'Hard'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => onUpdate(q.local_id, 'difficulty', lvl)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${q.difficulty?.toLowerCase() === lvl.toLowerCase()
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={onVerify}
                                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs font-bold"
                            >
                                <CheckCircle className="w-3 h-3 mr-2" />
                                Verify & Add
                            </Button>
                            <button
                                onClick={() => onDelete(q.local_id)}
                                className="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

// --- Passage Group Component ---
function PassageGroup({
    passageId,
    passageContent,
    passageImage,
    questions,
    startIndex,
    onDelete,
    onUpdate,
    onVerify,
    selectedIds,
    onToggleSelect
}: {
    passageId: string;
    passageContent?: string | null;
    passageImage?: string | null;
    questions: Question[];
    startIndex: number;
    onDelete: (id: string) => void;
    onUpdate: (id: string, key: string, value: any) => void;
    onVerify: (q: Question) => void;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string, checked: boolean) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <Card className="border-indigo-200 bg-indigo-50/30">
            <div className="p-4 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900">Reading Passage Group</h3>
                        <p className="text-xs text-indigo-600">{questions.length} questions associated</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </Button>
            </div>

            {isExpanded && (
                <CardContent className="p-4 space-y-6">
                    {/* Passage Content */}
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Passage Content</Label>
                        {passageImage && (
                            <div className="mb-4">
                                <img src={passageImage} alt="Passage" className="max-h-64 object-contain rounded-lg border border-slate-200" />
                            </div>
                        )}
                        <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 max-h-96 overflow-y-auto">
                            <MarkdownLatexRenderer content={passageContent || "*No content available*"} />
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
                        {questions.map((q, idx) => (
                            <QuestionCard
                                key={q.local_id}
                                q={q}
                                idx={startIndex + idx}
                                onDelete={onDelete}
                                onUpdate={onUpdate}
                                onVerify={() => onVerify(q)}
                                isSelected={selectedIds?.has(q.local_id)}
                                onToggleSelect={onToggleSelect}
                            />
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
