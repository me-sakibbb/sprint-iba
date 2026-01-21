"use client";

import { useState } from 'react';
import {
    Upload, CheckCircle, AlertCircle,
    Loader2, Trash2, ChevronDown, BrainCircuit,
    Info, Tag, MessageSquareQuote, Layers, RefreshCw, Search, Filter, Image as ImageIcon
} from 'lucide-react';
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
import { MarkdownLatexRenderer } from "@/components/admin/MarkdownLatexRenderer";
import { useTaxonomy, useSubjects, useTopics, useSubtopics } from "@/hooks/useTaxonomy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';

const MDEditor = dynamic(
    () => import("@uiw/react-md-editor").then((mod) => mod.default),
    { ssr: false }
);
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

export default function QuestionExtractor() {
    // Extraction state
    const [file, setFile] = useState<File | null>(null);
    const [pagesPerChunk, setPagesPerChunk] = useState(3);
    const [startPage, setStartPage] = useState<number | undefined>(undefined);
    const [endPage, setEndPage] = useState<number | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-flash');

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

        // Pass refetch as callback - UI will update after each chunk is saved
        await extract(file, config, selectedModel, refetch);
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
                    is_verified: true
                } as any)
                .eq('id', q.local_id);

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
                <Button variant="outline" onClick={refetch} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Token Usage Stats */}
            <TokenUsageStats />

            {/* Upload Section */}
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
                    questions.map((q, idx) => (
                        <QuestionCard
                            key={q.local_id}
                            q={q}
                            idx={(currentPage - 1) * filters.itemsPerPage + idx}
                            onDelete={handleDelete}
                            onUpdate={updateQuestionLocally}
                            onVerify={() => handleVerify(q)}
                        />
                    ))
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
        </div>
    );
}

// --- Question Card Component ---
function QuestionCard({
    q,
    idx,
    onDelete,
    onUpdate,
    onVerify
}: {
    q: Question;
    idx: number;
    onDelete: (id: string) => void;
    onUpdate: (id: string, key: string, value: any) => void;
    onVerify: () => void;
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
                className="p-4 flex items-center gap-4 cursor-pointer select-none"
                onClick={() => setOpen(!open)}
            >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 border shrink-0">
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
                    {(q.has_image || (q.images && q.images.length > 0)) && (
                        <div className="mt-4 space-y-4">
                            {q.image_url && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3" /> Main Image
                                    </Label>
                                    <img
                                        src={q.image_url}
                                        alt="Question image"
                                        className="max-w-full rounded-lg border border-slate-200"
                                    />
                                </div>
                            )}

                            {q.images && q.images.length > 0 && (
                                <div className="grid grid-cols-1 gap-4">
                                    {q.images.map((img, i) => (
                                        <div key={img.id || i} className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <ImageIcon className="w-3 h-3" /> Image {i + 1} {img.description && `- ${img.description}`}
                                            </Label>
                                            <img
                                                src={img.image_url}
                                                alt={`Extra image ${i + 1}`}
                                                className="max-w-full rounded-lg border border-slate-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
