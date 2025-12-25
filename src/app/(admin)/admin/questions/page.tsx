"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Upload, FileText, CheckCircle, AlertCircle, Settings,
    Loader2, Trash2, Save, ChevronDown, Zap, BrainCircuit, Activity,
    ListFilter, Sparkles, Cpu, Globe, ShieldCheck, Database,
    Info, BarChart3, Tag, MessageSquareQuote, Layers, X, Plus, AlertTriangle
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
    const [pdfText, setPdfText] = useState("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: string; message: string } | null>(null);
    const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
    const [currentStep, setCurrentStep] = useState('IDLE');
    const [lastError, setLastError] = useState<string | null>(null);

    const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics>({
        current: 0,
        total: 0,
        foundCount: 0,
        errorCount: 0,
        subStatus: "Ready",
        phase: "Idle"
    });

    const addLog = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
        setProcessLogs(prev => [
            { id: crypto.randomUUID(), msg, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
            ...prev
        ].slice(0, 50));
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setQuestions([]);
        setUploadStatus(null);
        setPdfText("");
        setLastError(null);

        if (!window.pdfjsLib) {
            const script = document.createElement('script');
            script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
            script.onload = () => loadPdf(selectedFile);
            document.body.appendChild(script);
        } else {
            loadPdf(selectedFile);
        }
    };

    const loadPdf = async (file: File) => {
        setCurrentStep('PARSING');
        setLastError(null);
        addLog(`Loading PDF: ${file.name}`);
        setProgressMetrics(p => ({ ...p, phase: 'Parsing PDF', subStatus: 'Reading pages...', current: 0, total: 100 }));

        try {
            const arrayBuffer = await file.arrayBuffer();
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;

            let fullText = "";
            setProgressMetrics(p => ({ ...p, total: pdf.numPages, current: 0 }));

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += `\n--- PAGE ${i} ---\n` + pageText;
                setProgressMetrics(p => ({ ...p, current: i, subStatus: `Extracted page ${i}/${pdf.numPages}` }));
            }

            setPdfText(fullText);
            addLog(`Extracted ${pdf.numPages} pages successfully`, 'success');
        } catch (err: any) {
            const msg = `PDF Parsing Failed: ${err.message}`;
            setLastError(msg);
            addLog(msg, 'error');
        } finally {
            setCurrentStep('IDLE');
            setProgressMetrics(p => ({ ...p, phase: 'Idle' }));
        }
    };

    const processWithAI = async () => {
        if (!pdfText || !config.geminiKey) {
            if (!config.geminiKey) {
                toast.error("Please enter your Gemini API key in settings");
                setShowConfig(true);
            }
            return;
        }
        setIsProcessing(true);
        setCurrentStep('EXTRACTION');
        setQuestions([]);
        setUploadStatus(null);
        setLastError(null);

        const CHUNK_SIZE = 7500;
        const chunks: string[] = [];
        for (let i = 0; i < pdfText.length; i += CHUNK_SIZE) {
            chunks.push(pdfText.substring(i, i + CHUNK_SIZE));
        }

        setProgressMetrics({
            current: 0,
            total: chunks.length,
            foundCount: 0,
            errorCount: 0,
            subStatus: "Initializing AI...",
            phase: "Analyzing Text"
        });

        try {
            const limit = Math.max(1, config.concurrency || 3);
            for (let i = 0; i < chunks.length; i += limit) {
                const batch = chunks.slice(i, i + limit);
                addLog(`Analyzing chunk batch ${Math.floor(i / limit) + 1}...`);

                const results = await Promise.all(
                    batch.map((chunk, idx) => callGemini(chunk, i + idx + 1))
                );

                results.forEach((result) => {
                    if (result && Array.isArray(result)) {
                        const processed: Question[] = result.map((q: any) => ({
                            local_id: crypto.randomUUID(),
                            is_verified: false,
                            question_text: q.question_text || "",
                            correct_answer: (q.correct_answer || "A").toUpperCase(),
                            options: q.options || { A: "", B: "", C: "", D: "" },
                            topic: q.topic || "Uncategorized",
                            subtopic: q.subtopic || "General",
                            difficulty: q.difficulty || "Medium",
                            explanation: q.explanation || ""
                        }));
                        setQuestions(prev => [...prev, ...processed]);
                        setProgressMetrics(p => ({
                            ...p,
                            foundCount: p.foundCount + processed.length,
                            current: p.current + 1,
                            subStatus: `Processed chunk ${p.current + 1}/${chunks.length}`
                        }));
                    } else {
                        setProgressMetrics(p => ({
                            ...p,
                            errorCount: p.errorCount + 1,
                            current: p.current + 1,
                            subStatus: `Chunk failed (${p.current + 1}/${chunks.length})`
                        }));
                    }
                });
            }
            addLog(`AI extraction complete. Found ${progressMetrics.foundCount} items.`, 'success');
        } catch (err: any) {
            setLastError(`Critical Extraction Error: ${err.message}`);
            addLog(err.message, 'error');
        } finally {
            setIsProcessing(false);
            setCurrentStep('IDLE');
            setProgressMetrics(p => ({ ...p, phase: 'Idle' }));
        }
    };

    const callGemini = async (input: string, id: number): Promise<any[] | null> => {
        const MODEL = "gemini-2.0-flash-lite";
        const prompt = `
      Task: Extract MCQs from text.
      Format: Strict JSON array of objects.
      Fields: question_text, options (object with A,B,C,D keys), correct_answer (A/B/C/D), topic, subtopic, difficulty (Easy/Medium/Hard), explanation.
      Language: Use LaTeX for math ($...$).
      Input: ${input}
    `;

        try {
            const res = await fetchWithRetry(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${config.geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
                    })
                },
                (retryMsg) => addLog(`Chunk ${id}: ${retryMsg}`)
            );

            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return rawText ? JSON.parse(rawText) : null;
        } catch (e: any) {
            addLog(`Chunk ${id} Failed: ${e.message}`, 'error');
            return null;
        }
    };

    const handleSync = async () => {
        if (questions.length === 0) return;
        setUploadStatus({ type: 'info', message: 'Syncing to database...' });

        try {
            const questionsToInsert = questions.map(q => ({
                question_text: q.question_text,
                options: [q.options.A, q.options.B, q.options.C, q.options.D],
                correct_answer: q.correct_answer,
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty.toLowerCase(),
                explanation: q.explanation,
                subject: q.topic
            }));

            const { error } = await supabase
                .from('questions')
                .insert(questionsToInsert as any);

            if (error) throw error;

            setUploadStatus({ type: 'success', message: `Synced ${questions.length} questions to database!` });
            toast.success(`Successfully synced ${questions.length} questions!`);
            setQuestions([]);
        } catch (error: any) {
            setUploadStatus({ type: 'error', message: `Sync failed: ${error.message}` });
            toast.error(`Sync failed: ${error.message}`);
        }
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.local_id !== id));
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
                    <p className="text-slate-500 mt-1">Upload PDFs and extract MCQs using AI</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowConfig(!showConfig)}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button
                        onClick={handleSync}
                        disabled={questions.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Database className="w-4 h-4 mr-2" />
                        Sync to Database ({questions.length})
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {lastError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-rose-100 p-2 rounded-lg shrink-0">
                        <AlertTriangle className="text-rose-600 w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-rose-900">Operation Error</h4>
                        <p className="text-xs text-rose-700 mt-0.5">{lastError}</p>
                    </div>
                    <button onClick={() => setLastError(null)} className="text-rose-400 hover:text-rose-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Upload Status */}
            {uploadStatus && (
                <div className={`border rounded-xl p-4 flex items-center gap-3 ${uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
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

            {/* Config Panel */}
            {showConfig && (
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Configuration Settings
                            </h3>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Gemini AI Key</Label>
                                <Input
                                    type="password"
                                    value={config.geminiKey}
                                    onChange={e => setConfig({ ...config, geminiKey: e.target.value })}
                                    placeholder="Enter your Gemini API key"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Batch Concurrency</Label>
                                <Input
                                    type="number"
                                    value={config.concurrency}
                                    onChange={e => setConfig({ ...config, concurrency: parseInt(e.target.value) || 3 })}
                                    min={1}
                                    max={10}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Questions List */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Extraction Queue ({questions.length})
                        </h2>
                        {questions.length > 0 && (
                            <button onClick={() => setQuestions([])} className="text-xs font-semibold text-rose-600 hover:underline">
                                Clear Queue
                            </button>
                        )}
                    </div>

                    {questions.length === 0 && !isProcessing ? (
                        <Card className="border-2 border-dashed border-slate-200">
                            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                                <div className="bg-slate-50 p-4 rounded-full mb-4">
                                    <Upload className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 font-bold">No questions extracted yet</h3>
                                <p className="text-slate-500 text-sm max-w-xs mt-1">
                                    Upload a PDF on the right to start the AI extraction process.
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
                                />
                            ))}
                            {isProcessing && (
                                <Card className="border-indigo-100">
                                    <CardContent className="py-12 flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-indigo-600 w-7 h-7" />
                                        <p className="text-indigo-900 font-semibold text-sm">AI is reading your document...</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <aside className="lg:col-span-4 space-y-6">
                    {/* File Upload */}
                    <Card className="border-slate-200">
                        <CardContent className="p-5 space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Source Material
                            </h3>

                            <div className="relative group border-2 border-dashed border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl p-8 text-center transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="w-6 h-6 mx-auto text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
                                <p className="text-xs font-bold text-slate-600 truncate">
                                    {file ? file.name : "Choose PDF File"}
                                </p>
                            </div>

                            {pdfText && (
                                <Button
                                    onClick={processWithAI}
                                    disabled={isProcessing}
                                    className="w-full bg-slate-900 hover:bg-slate-800"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                                    Extract Questions
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Progress & Logs */}
                    {(isProcessing || currentStep !== 'IDLE' || processLogs.length > 0) && (
                        <Card className="border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pipeline Health</h3>
                                {(isProcessing || currentStep !== 'IDLE') && <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />}
                            </div>

                            {(isProcessing || currentStep !== 'IDLE') && (
                                <div className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                            <span className="text-indigo-600 uppercase tracking-tight">{progressMetrics.phase}</span>
                                            <span className="tabular-nums">{Math.round((progressMetrics.current / (progressMetrics.total || 1)) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                            <div
                                                className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                                                style={{ width: `${(progressMetrics.current / (progressMetrics.total || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium italic truncate">{progressMetrics.subStatus}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase">Success</p>
                                            <p className="text-sm font-bold text-emerald-700">{progressMetrics.foundCount}</p>
                                        </div>
                                        <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-center">
                                            <p className="text-[9px] font-black text-rose-600 uppercase">Fails</p>
                                            <p className="text-sm font-bold text-rose-700">{progressMetrics.errorCount}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="max-h-48 overflow-y-auto p-4 space-y-2 text-[11px] font-medium text-slate-500 border-t border-slate-50">
                                <div className="flex flex-col gap-1.5">
                                    {processLogs.map(log => (
                                        <div key={log.id} className="flex gap-2 items-start group">
                                            <span className="opacity-30 shrink-0 font-mono">{log.time}</span>
                                            <span className={`${log.type === 'error' ? 'text-rose-500' : log.type === 'success' ? 'text-emerald-600 font-bold' : 'text-slate-600'} leading-relaxed`}>
                                                {log.msg}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Stats Summary */}
                    <Card className="bg-slate-900 border-slate-800 text-white overflow-hidden relative">
                        <CardContent className="p-5">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Database className="w-16 h-16" />
                            </div>
                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Items Ready</p>
                                    <p className="text-2xl font-bold tabular-nums">{questions.length}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Batch</p>
                                    <p className="text-2xl font-bold tabular-nums">{config.concurrency}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

// Question Card Component
function QuestionCard({
    q,
    idx,
    onDelete,
    onUpdate
}: {
    q: Question;
    idx: number;
    onDelete: (id: string) => void;
    onUpdate: (id: string, key: string, value: any) => void;
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
                        <button
                            onClick={() => onDelete(q.local_id)}
                            className="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
