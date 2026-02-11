import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Question = Tables<'questions'>;

export interface MistakeLog {
    id: string;
    user_id: string;
    question_id: string;
    user_answer: string | null;
    correct_answer: string;
    context: 'practice' | 'exam';
    session_id: string | null;
    time_taken_seconds: number | null;
    topic: string | null;
    subtopic: string | null;
    difficulty: string | null;
    created_at: string;
}

export interface MistakeStat {
    question_id: string;
    severity_level: 'low' | 'medium' | 'high' | 'critical';
    severity_score: number;
    mistake_count: number;
    correct_after_last_mistake: number;
    last_mistake_at: string;
}

export interface MistakeWithQuestion extends MistakeLog {
    question: Question;
    mistake_stats?: MistakeStat;
    passage?: Tables<'reading_passages'> | null;
}

export interface AIFeedback {
    id: string;
    feedback_type: 'overall' | 'category' | 'subject';
    scope_value: string | null;
    feedback_text: string;
    pattern_analysis: string | null;
    root_causes: string | null;
    learning_gaps: string | null;
    action_plan: string | null;
    practice_focus: string | null;
    mistake_count: number;
    created_at: string;
    expires_at: string;
}

export interface MistakeFilters {
    topics?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    severityLevels?: string[];
}

export interface MistakeAnalytics {
    totalMistakes: number;
    highPriorityCount: number;
    mistakesByTopic: Record<string, number>;
    mistakesBySeverity: Record<string, number>;
    recentTrend: {
        date: string;
        count: number;
    }[];
}

export function useMistakes() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mistakes, setMistakes] = useState<MistakeWithQuestion[]>([]);
    const [analytics, setAnalytics] = useState<MistakeAnalytics | null>(null);

    // Fetch mistakes with filters
    const fetchMistakes = useCallback(async (filters?: MistakeFilters) => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('mistake_logs')
                .select('*, questions(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Apply topic filter
            if (filters?.topics && filters.topics.length > 0) {
                query = query.in('topic', filters.topics);
            }

            // Apply date range filter
            if (filters?.dateRange) {
                query = query
                    .gte('created_at', filters.dateRange.start.toISOString())
                    .lte('created_at', filters.dateRange.end.toISOString());
            }

            const { data: mistakeLogs, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Enrich with stats and passages
            const enrichedMistakes: MistakeWithQuestion[] = [];

            // Fetch all stats for these questions in one go from the view
            const questionIds = Array.from(new Set(mistakeLogs?.map(log => log.question_id) || []));
            const questions = mistakeLogs?.map(log => (log as any).questions as unknown as Question) || [];

            // Fetch passages
            const passageIds = Array.from(new Set(questions.map(q => q.passage_id).filter(id => !!id))) as string[];
            const { data: passages } = await supabase
                .from('reading_passages')
                .select('*')
                .in('id', passageIds);

            const passageMap = new Map(passages?.map(p => [p.id, p]));

            const { data: allStats } = await supabase
                .from('mistake_stats' as any)
                .select('*')
                .eq('user_id', user.id)
                .in('question_id', questionIds);

            for (const log of mistakeLogs || []) {
                const stats = (allStats as any[])?.find(s => s.question_id === log.question_id);
                const question = (log as any).questions as unknown as Question;
                const passage = question.passage_id ? passageMap.get(question.passage_id) : null;

                enrichedMistakes.push({
                    ...log,
                    question,
                    mistake_stats: stats as any as MistakeStat,
                    passage
                });
            }

            // Apply severity filter after enrichment
            let filtered = enrichedMistakes;
            if (filters?.severityLevels && filters.severityLevels.length > 0) {
                filtered = enrichedMistakes.filter(m =>
                    filters.severityLevels!.includes(m.mistake_stats?.severity_level || 'low')
                );
            }

            setMistakes(filtered);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Get analytics
    const fetchAnalytics = useCallback(async () => {
        if (!user) return;

        try {
            // Get all mistakes for analytics
            const { data: allMistakes, error: fetchError } = await supabase
                .from('mistake_logs')
                .select('*')
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            // If no mistakes, set empty analytics and return
            if (!allMistakes || allMistakes.length === 0) {
                setAnalytics({
                    totalMistakes: 0,
                    highPriorityCount: 0,
                    mistakesByTopic: {},
                    mistakesBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                    recentTrend: []
                });
                return;
            }

            // Get high priority count
            let highPriority: any[] = [];

            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_high_priority_mistakes', {
                    p_user_id: user.id,
                    p_limit: 1000,
                    p_min_score: 30
                });

            if (rpcError) {
                console.warn('RPC get_high_priority_mistakes failed, using fallback query:', rpcError);
                // Fallback: Query the view directly
                const { data: fallbackData, error: fallbackError } = await (supabase
                    .from('mistake_stats' as any)
                    .select('*') as any)
                    .eq('user_id', user.id)
                    .gte('severity_score', 30)
                    .order('severity_score', { ascending: false })
                    .limit(1000);

                if (fallbackError) {
                    console.error('Fallback query also failed:', fallbackError);
                } else {
                    highPriority = fallbackData || [];
                }
            } else {
                highPriority = rpcData || [];
            }

            // Calculate analytics
            const mistakesByTopic: Record<string, number> = {};
            const mistakesBySeverity: Record<string, number> = {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            };

            allMistakes?.forEach(mistake => {
                if (mistake.topic) {
                    mistakesByTopic[mistake.topic] = (mistakesByTopic[mistake.topic] || 0) + 1;
                }
            });

            highPriority?.forEach(stat => {
                mistakesBySeverity[stat.severity_level] = (mistakesBySeverity[stat.severity_level] || 0) + 1;
            });

            // Calculate recent trend (last 7 days)
            const today = new Date();
            const recentTrend: { date: string; count: number }[] = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const count = allMistakes?.filter(m =>
                    m.created_at.startsWith(dateStr)
                ).length || 0;

                recentTrend.push({ date: dateStr, count });
            }

            setAnalytics({
                totalMistakes: allMistakes?.length || 0,
                highPriorityCount: highPriority?.length || 0,
                mistakesByTopic,
                mistakesBySeverity,
                recentTrend
            });

        } catch (err: any) {
            console.error('Error fetching analytics:', err);
            setAnalytics({
                totalMistakes: 0,
                highPriorityCount: 0,
                mistakesByTopic: {},
                mistakesBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                recentTrend: []
            });
        }
    }, [user]);

    // Get high priority mistakes for practice mode
    const getHighPriorityMistakes = useCallback(async (limit: number = 50) => {
        if (!user) return [];

        const { data, error } = await supabase
            .rpc('get_high_priority_mistakes', {
                p_user_id: user.id,
                p_limit: limit,
                p_min_score: 30
            });

        if (error) {
            console.warn('RPC get_high_priority_mistakes failed, using fallback query:', error);
            // Fallback: Query the view directly
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('mistake_stats' as any)
                .select('*')
                .eq('user_id', user.id)
                .gte('severity_score', 30)
                .order('severity_score', { ascending: false })
                .limit(limit);

            if (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
                return [];
            }
            return fallbackData || [];
        }

        return data || [];
    }, [user]);

    // Get questions from mistakes for practice
    const getMistakeQuestions = useCallback(async (limit: number = 20, topicFilter?: string[]) => {
        if (!user) return [];

        try {
            const highPriorityMistakes = await getHighPriorityMistakes(100);
            let questionIds = highPriorityMistakes.map(m => m.question_id);

            // Fetch full questions
            let query = supabase
                .from('questions')
                .select('*')
                .in('id', questionIds);

            if (topicFilter && topicFilter.length > 0) {
                query = query.in('topic', topicFilter);
            }

            const { data: questions, error } = await query.limit(limit);

            if (error) throw error;

            // Sort by severity score
            const sortedQuestions = questions?.sort((a, b) => {
                const severityA = (highPriorityMistakes as any[]).find((m: any) => m.question_id === a.id)?.severity_score || 0;
                const severityB = (highPriorityMistakes as any[]).find((m: any) => m.question_id === b.id)?.severity_score || 0;
                return severityB - severityA;
            });

            return sortedQuestions || [];

        } catch (err: any) {
            console.error('Error fetching mistake questions:', err);
            return [];
        }
    }, [user, getHighPriorityMistakes]);

    // Get AI feedback for a specific scope
    const getAIFeedback = useCallback(async (
        feedbackType: 'overall' | 'category' | 'subject',
        scopeValue?: string
    ): Promise<AIFeedback | null> => {
        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('ai_feedback_cache')
                .select('*')
                .eq('user_id', user.id)
                .eq('feedback_type', feedbackType)
                .eq('scope_value', (scopeValue ?? null) as any)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data as AIFeedback | null;

        } catch (err: any) {
            console.error('Error fetching AI feedback:', err);
            return null;
        }
    }, [user]);

    // Request AI feedback generation
    const requestAIFeedback = useCallback(async (
        feedbackType: 'overall' | 'category' | 'subject',
        scopeValue?: string
    ): Promise<AIFeedback | null> => {
        if (!user) return null;

        try {
            const { data, error } = await supabase.functions.invoke('generate-mistake-insights', {
                body: {
                    feedbackType,
                    scopeValue
                }
            });

            if (error) throw error;
            return data as AIFeedback;

        } catch (err: any) {
            console.error('Error requesting AI feedback:', err);
            throw err;
        }
    }, [user]);

    // Load initial data
    useEffect(() => {
        if (user) {
            fetchMistakes();
            fetchAnalytics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    return {
        loading,
        error,
        mistakes,
        analytics,
        fetchMistakes,
        fetchAnalytics,
        getHighPriorityMistakes,
        getMistakeQuestions,
        getAIFeedback,
        requestAIFeedback
    };
}
