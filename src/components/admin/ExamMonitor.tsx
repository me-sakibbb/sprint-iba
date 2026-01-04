"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Users,
    Clock,
    CheckCircle,
    Loader2,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Exam {
    id: string;
    title: string;
    duration_minutes: number;
    question_ids: string[];
}

interface Attempt {
    id: string;
    user_id: string;
    started_at: string;
    is_submitted: boolean;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

interface ExamMonitorProps {
    exam: Exam;
}

export default function ExamMonitor({ exam }: ExamMonitorProps) {
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAttempts = async () => {
        const { data, error } = await supabase
            .from('exam_attempts')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('exam_id', exam.id)
            .order('started_at', { ascending: false });

        if (!error) {
            setAttempts((data || []) as unknown as Attempt[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAttempts();

        // Set up real-time subscription
        const channel = supabase
            .channel(`exam-${exam.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_attempts',
                    filter: `exam_id=eq.${exam.id}`,
                },
                () => {
                    fetchAttempts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [exam.id]);

    const inProgress = attempts.filter(a => !a.is_submitted);
    const completed = attempts.filter(a => a.is_submitted);

    const getTimeRemaining = (startedAt: string) => {
        const start = new Date(startedAt);
        const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
        const total = exam.duration_minutes * 60;
        const remaining = Math.max(0, total - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgress = (startedAt: string) => {
        const start = new Date(startedAt);
        const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
        const total = exam.duration_minutes * 60;
        return Math.min(100, (elapsed / total) * 100);
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{attempts.length}</div>
                        <div className="text-sm text-slate-500">Total Participants</div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold">{inProgress.length}</div>
                        <div className="text-sm text-slate-500">In Progress</div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{completed.length}</div>
                        <div className="text-sm text-slate-500">Completed</div>
                    </CardContent>
                </Card>
            </div>

            {/* Refresh */}
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={fetchAttempts} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* In Progress */}
            {inProgress.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        Currently Taking ({inProgress.length})
                    </h3>
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                            {inProgress.map((attempt) => (
                                <Card key={attempt.id} className="border-slate-200">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={attempt.profiles?.avatar_url || ''} />
                                            <AvatarFallback>
                                                {attempt.profiles?.full_name?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {attempt.profiles?.full_name || 'Anonymous'}
                                            </div>
                                            <Progress value={getProgress(attempt.started_at)} className="h-2 mt-2" />
                                        </div>
                                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                            {getTimeRemaining(attempt.started_at)} left
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Completed ({completed.length})
                    </h3>
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                            {completed.map((attempt) => (
                                <Card key={attempt.id} className="border-slate-200">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={attempt.profiles?.avatar_url || ''} />
                                            <AvatarFallback>
                                                {attempt.profiles?.full_name?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {attempt.profiles?.full_name || 'Anonymous'}
                                            </div>
                                        </div>
                                        <Badge className="bg-green-500">Submitted</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {attempts.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500">
                    No participants yet
                </div>
            )}
        </div>
    );
}
