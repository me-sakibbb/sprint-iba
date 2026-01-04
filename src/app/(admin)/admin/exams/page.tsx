"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    FileText,
    Trophy,
    Loader2,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Users,
    Download,
    Clock,
    RefreshCw,
    Calendar,
    CheckCircle,
    XCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ExamEditor from "@/components/admin/ExamEditor";
import ExamMonitor from "@/components/admin/ExamMonitor";

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
    created_at: string;
}

interface ExamStats {
    exam_id: string;
    total_attempts: number;
    completed_attempts: number;
    avg_score: number;
}

export default function AdminExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [examStats, setExamStats] = useState<Map<string, ExamStats>>(new Map());
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [showMonitor, setShowMonitor] = useState(false);
    const [monitorExam, setMonitorExam] = useState<Exam | null>(null);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setExams((data || []) as Exam[]);

            // Fetch stats for each exam
            const statsMap = new Map<string, ExamStats>();
            for (const exam of data || []) {
                const { data: attempts } = await supabase
                    .from('exam_attempts')
                    .select('score, is_submitted')
                    .eq('exam_id', exam.id);

                const completed = attempts?.filter((a: any) => a.is_submitted) || [];
                const avgScore = completed.length > 0
                    ? completed.reduce((sum: number, a: any) => sum + a.score, 0) / completed.length
                    : 0;

                statsMap.set(exam.id, {
                    exam_id: exam.id,
                    total_attempts: attempts?.length || 0,
                    completed_attempts: completed.length,
                    avg_score: Math.round(avgScore * 10) / 10,
                });
            }
            setExamStats(statsMap);

        } catch (error: any) {
            toast.error("Failed to fetch exams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleCreateExam = () => {
        setSelectedExam(null);
        setShowEditor(true);
    };

    const handleEditExam = (exam: Exam) => {
        setSelectedExam(exam);
        setShowEditor(true);
    };

    const handleDeleteExam = async (examId: string) => {
        if (!confirm("Are you sure you want to delete this exam? This will also delete all attempts.")) {
            return;
        }

        try {
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', examId);

            if (error) throw error;
            toast.success("Exam deleted");
            fetchExams();
        } catch (error: any) {
            toast.error("Failed to delete exam");
        }
    };

    const handleTogglePublish = async (exam: Exam) => {
        try {
            const { error } = await supabase
                .from('exams')
                .update({ is_published: !exam.is_published } as any)
                .eq('id', exam.id);

            if (error) throw error;
            toast.success(exam.is_published ? "Exam unpublished" : "Exam published");
            fetchExams();
        } catch (error: any) {
            toast.error("Failed to update exam");
        }
    };

    const handleExportResults = async (exam: Exam) => {
        try {
            const { data: attempts, error } = await supabase
                .from('exam_attempts')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        email
                    )
                `)
                .eq('exam_id', exam.id)
                .eq('is_submitted', true)
                .order('score', { ascending: false });

            if (error) throw error;

            // Create CSV
            const headers = ['Rank', 'Name', 'Email', 'Score', 'Total', 'Percentage', 'Submitted At'];
            const rows = (attempts || []).map((a: any, idx: number) => [
                idx + 1,
                a.profiles?.full_name || 'Anonymous',
                a.profiles?.email || '',
                a.score,
                a.total_questions,
                Math.round((a.score / a.total_questions) * 100) + '%',
                a.submitted_at ? format(new Date(a.submitted_at), 'yyyy-MM-dd HH:mm:ss') : ''
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${exam.title.replace(/\s+/g, '_')}_results.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("Results exported");
        } catch (error: any) {
            toast.error("Failed to export results");
        }
    };

    const handleMonitor = (exam: Exam) => {
        setMonitorExam(exam);
        setShowMonitor(true);
    };

    const mockExams = exams.filter(e => e.type === 'mock');
    const liveExams = exams.filter(e => e.type === 'live');

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        Exam Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create and manage mock and live exams</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={fetchExams} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleCreateExam} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Exam
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="mock">
                <TabsList>
                    <TabsTrigger value="mock">Mock Exams ({mockExams.length})</TabsTrigger>
                    <TabsTrigger value="live">Live Exams ({liveExams.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="mock" className="mt-6">
                    <ExamList
                        exams={mockExams}
                        stats={examStats}
                        loading={loading}
                        onEdit={handleEditExam}
                        onDelete={handleDeleteExam}
                        onTogglePublish={handleTogglePublish}
                        onExport={handleExportResults}
                        onMonitor={handleMonitor}
                    />
                </TabsContent>

                <TabsContent value="live" className="mt-6">
                    <ExamList
                        exams={liveExams}
                        stats={examStats}
                        loading={loading}
                        onEdit={handleEditExam}
                        onDelete={handleDeleteExam}
                        onTogglePublish={handleTogglePublish}
                        onExport={handleExportResults}
                        onMonitor={handleMonitor}
                    />
                </TabsContent>
            </Tabs>

            {/* Exam Editor Dialog */}
            <Dialog open={showEditor} onOpenChange={setShowEditor}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
                    </DialogHeader>
                    <ExamEditor
                        exam={selectedExam}
                        onSave={() => {
                            setShowEditor(false);
                            fetchExams();
                        }}
                        onCancel={() => setShowEditor(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Monitor Dialog */}
            <Dialog open={showMonitor} onOpenChange={setShowMonitor}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Live Monitor: {monitorExam?.title}</DialogTitle>
                    </DialogHeader>
                    {monitorExam && <ExamMonitor exam={monitorExam} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface ExamListProps {
    exams: Exam[];
    stats: Map<string, ExamStats>;
    loading: boolean;
    onEdit: (exam: Exam) => void;
    onDelete: (id: string) => void;
    onTogglePublish: (exam: Exam) => void;
    onExport: (exam: Exam) => void;
    onMonitor: (exam: Exam) => void;
}

function ExamList({ exams, stats, loading, onEdit, onDelete, onTogglePublish, onExport, onMonitor }: ExamListProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (exams.length === 0) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-2">No Exams Yet</h3>
                    <p className="text-slate-500">Create your first exam to get started.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {exams.map((exam) => {
                const examStat = stats.get(exam.id);

                return (
                    <Card key={exam.id} className="border-slate-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-slate-900">{exam.title}</h3>
                                        <Badge variant={exam.is_published ? "default" : "secondary"}>
                                            {exam.is_published ? 'Published' : 'Draft'}
                                        </Badge>
                                        {exam.type === 'live' && exam.start_time && (
                                            <Badge variant="outline" className="border-blue-500 text-blue-500">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {format(new Date(exam.start_time), 'MMM d, h:mm a')}
                                            </Badge>
                                        )}
                                    </div>

                                    {exam.description && (
                                        <p className="text-slate-500 text-sm mb-3">{exam.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            {exam.question_ids?.length || 0} questions
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {exam.duration_minutes} min
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {examStat?.completed_attempts || 0} completed
                                        </div>
                                        {examStat && examStat.completed_attempts > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Trophy className="w-4 h-4" />
                                                Avg: {examStat.avg_score}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(exam)}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onTogglePublish(exam)}>
                                            {exam.is_published ? (
                                                <>
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Unpublish
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Publish
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onMonitor(exam)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Monitor
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onExport(exam)}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Export Results
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onDelete(exam.id)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
