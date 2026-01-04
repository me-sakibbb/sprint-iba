"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Upload, FileText, CheckCircle, AlertCircle, Settings,
    Loader2, Trash2, Save, ChevronDown, Zap, BrainCircuit, Activity,
    ListFilter, Sparkles, Cpu, Globe, ShieldCheck, Database,
    Info, BarChart3, Tag, MessageSquareQuote, Layers, X, Plus, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// --- Configuration & Constants ---
const PDFJS_VERSION = '3.11.174';
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const DEFAULT_CONFIG = {
    geminiKey: "",
    concurrency: 3
};

// --- Utilities ---
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    onRetry?: (msg: string) => void,
    retries = 5,
    backoff = 1500
): Promise<Response> {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = (errorData as any)?.error?.message || response.statusText;

            if (response.status === 429 || response.status >= 500) {
                throw new Error(`Server Error (${response.status}): ${errorMsg}`);
            }
            throw new Error(`Fatal Error (${response.status}): ${errorMsg}`);
        }
        return response;
    } catch (err: any) {
        if (retries > 0 && !err.message.includes("Fatal")) {
            onRetry?.(`Retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, onRetry, retries - 1, backoff * 1.5);
        }
        throw err;
    }
}

interface Question {
    local_id: string;
    question_text: string;
    options: { A: string; B: string; C: string; D: string };
    correct_answer: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    explanation: string;
    is_verified: boolean;
}

interface LogEntry {
    id: string;
    msg: string;
    type: 'info' | 'success' | 'error';
    time: string;
}

interface ProgressMetrics {
    current: number;
    total: number;
    foundCount: number;
    errorCount: number;
    subStatus: string;
    phase: string;
}

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

export default function QuestionExtractor() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [showConfig, setShowConfig] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: string; message: string } | null>(null);
    const [loadingQuestions, setLoadingQuestions] = useState(true);

    useEffect(() => {
        fetchUnverifiedQuestions();
    }, []);

    const fetchUnverifiedQuestions = async () => {
        setLoadingQuestions(true);
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('is_verified', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedQuestions: Question[] = (data || []).map((q: any) => ({
                local_id: q.id,
                question_text: q.question_text,
                options: {
                    A: q.options?.[0] || "",
                    B: q.options?.[1] || "",
                    C: q.options?.[2] || "",
                    D: q.options?.[3] || ""
                },
                correct_answer: q.correct_answer,
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty,
                explanation: q.explanation,
                is_verified: false
            }));

            setQuestions(formattedQuestions);
        } catch (error: any) {
            toast.error("Failed to fetch unverified questions");
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
    };

    const startBackgroundExtraction = async () => {
        if (!file) return;

        setIsProcessing(true);
        setUploadStatus({ type: 'info', message: 'Uploading PDF...' });

        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('pdfs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            setUploadStatus({ type: 'info', message: 'Starting background extraction...' });

            // 2. Call Edge Function (Fire and forget)
            supabase.functions.invoke('extract-questions', {
                body: { filePath, bucketName: 'pdfs' }
            }).catch(err => console.error("Edge function error:", err));

            toast.success("Extraction started in background! You can close this page.");
            setUploadStatus({ type: 'success', message: 'Extraction started! Check back in a few minutes.' });
            setFile(null);

            // Refresh list after a short delay to see if any questions appeared (optional)
            setTimeout(fetchUnverifiedQuestions, 5000);

        } catch (error: any) {
            toast.error(`Failed to start extraction: ${error.message}`);
            setUploadStatus({ type: 'error', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerify = async (q: Question) => {
        try {
            const { error } = await supabase
                .from('questions')
                .update({
                    question_text: q.question_text,
                    options: [q.options.A, q.options.B, q.options.C, q.options.D],
                    correct_answer: q.correct_answer,
                    topic: q.topic,
                    subtopic: q.subtopic,
                    difficulty: q.difficulty.toLowerCase(),
                    explanation: q.explanation,
                    is_verified: true
                } as any)
                .eq('id', q.local_id);

            if (error) throw error;

            toast.success("Question verified and added to bank!");
            setQuestions(prev => prev.filter(item => item.local_id !== q.local_id));
        } catch (error: any) {
            toast.error(`Verification failed: ${error.message}`);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setQuestions(prev => prev.filter(q => q.local_id !== id));
            toast.success("Question deleted");
        } catch (error: any) {
            toast.error("Failed to delete question");
        }
    };

    const handleUpdateQuestion = (id: string, key: string, value: any) => {
        setQuestions(prev => prev.map(q => q.local_id === id ? { ...q, [key]: value } : q));
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        Question Extractor
                    </h1>
                    <p className="text-slate-500 mt-1">Upload PDFs for background AI extraction</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchUnverifiedQuestions}
                        disabled={loadingQuestions}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingQuestions ? 'animate-spin' : ''}`} />
                        Refresh List
                    </Button>
                </div>
            </div>

            {/* Upload Section */}
            <Card className="border-slate-200">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900">Upload New Document</h3>
                            <p className="text-sm text-slate-500">
                                Upload a PDF containing MCQs. Our AI will process it in the background
                                and extract questions for your review.
                            </p>

                            <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl p-8 text-center transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="w-8 h-8 mx-auto text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
                                <p className="text-sm font-bold text-slate-600 truncate">
                                    {file ? file.name : "Click or drag PDF to upload"}
                                </p>
                            </div>

                            <Button
                                onClick={startBackgroundExtraction}
                                disabled={!file || isProcessing}
                                className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg font-bold"
                            >
                                {isProcessing ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
                                Start Background Extraction
                            </Button>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Info className="w-4 h-4 text-indigo-600" /> How it works
                            </h4>
                            <ul className="space-y-3">
                                {[
                                    "Upload your PDF document",
                                    "AI processes it in the background",
                                    "Close the browser if you want",
                                    "Extracted questions appear below",
                                    "Review, edit, and verify to add to bank"
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                        <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Banner */}
            {uploadStatus && (
                <div className={`border rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                    uploadStatus.type === 'error' ? 'bg-rose-50 border-rose-200' :
                        'bg-blue-50 border-blue-200'
                    }`}>
                    {uploadStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                        uploadStatus.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-600" /> :
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                    <span className={`text-sm font-medium ${uploadStatus.type === 'success' ? 'text-emerald-700' :
                        uploadStatus.type === 'error' ? 'text-rose-700' :
                            'text-blue-700'
                        }`}>{uploadStatus.message}</span>
                </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Pending Review ({questions.length})
                    </h2>
                </div>

                {loadingQuestions ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
                        <p className="text-slate-500 text-sm">Loading pending questions...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <Card className="border-slate-200">
                        <CardContent className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-bold">All caught up!</h3>
                            <p className="text-slate-500 text-sm max-w-xs mt-1">
                                No questions pending review. Upload a new PDF to start extraction.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q, idx) => (
                            <QuestionCard
                                key={q.local_id}
                                q={q}
                                idx={idx}
                                onDelete={handleDeleteQuestion}
                                onUpdate={handleUpdateQuestion}
                                onVerify={() => handleVerify(q)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


// Question Card Component
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

    return (
        <Card className={`transition-all ${open ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <div
                className="p-4 flex items-center gap-4 cursor-pointer select-none"
                onClick={() => setOpen(!open)}
            >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-100 shrink-0">
                    {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {q.question_text || "Empty Question"}
                    </h4>
                    <div className="flex gap-3 mt-1 items-center">
                        <Badge variant="secondary" className="text-[10px] font-bold text-indigo-600 bg-indigo-50">
                            {q.topic}
                        </Badge>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{q.difficulty}</span>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <CardContent className="pt-0 border-t border-slate-50 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                        <div className="lg:col-span-8">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquareQuote className="w-3 h-3" /> Question Text
                            </Label>
                            <Textarea
                                value={q.question_text}
                                onChange={e => onUpdate(q.local_id, 'question_text', e.target.value)}
                                className="mt-2 min-h-[100px]"
                            />
                        </div>

                        <div className="lg:col-span-4 space-y-4">
                            <div>
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> Topic
                                </Label>
                                <Input
                                    value={q.topic}
                                    onChange={e => onUpdate(q.local_id, 'topic', e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-3 h-3" /> Sub-topic
                                </Label>
                                <Input
                                    value={q.subtopic}
                                    onChange={e => onUpdate(q.local_id, 'subtopic', e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['A', 'B', 'C', 'D'] as const).map(key => (
                            <div
                                key={key}
                                className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${q.correct_answer === key ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                                    }`}
                            >
                                <button
                                    onClick={() => onUpdate(q.local_id, 'correct_answer', key)}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all shrink-0 ${q.correct_answer === key
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-500'
                                        }`}
                                >
                                    {key}
                                </button>
                                <Textarea
                                    className="w-full bg-transparent text-sm resize-none border-0 p-0 focus-visible:ring-0"
                                    rows={2}
                                    value={q.options[key]}
                                    onChange={e => onUpdate(q.local_id, 'options', { ...q.options, [key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <BrainCircuit className="w-3 h-3" /> AI Explanation
                        </Label>
                        <Textarea
                            value={q.explanation}
                            onChange={e => onUpdate(q.local_id, 'explanation', e.target.value)}
                            placeholder="AI reasoning goes here..."
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <div className="flex gap-2">
                            {['Easy', 'Medium', 'Hard'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => onUpdate(q.local_id, 'difficulty', lvl)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${q.difficulty === lvl
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
                                className="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-colors"
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
