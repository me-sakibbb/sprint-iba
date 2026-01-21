import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface Subject {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    question_count?: number;
}

export interface Topic {
    id: string;
    subject_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    question_count?: number;
}

export interface Subtopic {
    id: string;
    topic_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    question_count?: number;
}

// --- Subjects Hook ---
export function useSubjects() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select(`
                    *,
                    questions:questions(count)
                `)
                .order('name');

            if (error) throw error;

            const subjectsWithCount = data.map(s => ({
                ...s,
                question_count: s.questions?.[0]?.count || 0,
                questions: undefined,
            }));

            setSubjects(subjectsWithCount);
        } catch (error: any) {
            toast.error(`Failed to load subjects: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    const createSubject = async (name: string, description?: string) => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .insert({ name, description })
                .select()
                .single();

            if (error) throw error;
            toast.success('Subject created');
            await fetchSubjects();
            return data;
        } catch (error: any) {
            toast.error(`Failed to create subject: ${error.message}`);
            throw error;
        }
    };

    const updateSubject = async (id: string, updates: Partial<Subject>) => {
        try {
            const { error } = await supabase
                .from('subjects')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast.success('Subject updated');
            await fetchSubjects();
        } catch (error: any) {
            toast.error(`Failed to update subject: ${error.message}`);
            throw error;
        }
    };

    const deleteSubject = async (id: string) => {
        try {
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Subject deleted');
            await fetchSubjects();
        } catch (error: any) {
            toast.error(`Failed to delete subject: ${error.message}`);
            throw error;
        }
    };

    return {
        subjects,
        loading,
        refetch: fetchSubjects,
        createSubject,
        updateSubject,
        deleteSubject,
    };
}

// --- Topics Hook ---
export function useTopics(subjectId?: string) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTopics = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('topics')
                .select(`
                    *,
                    questions:questions(count)
                `)
                .order('name');

            if (subjectId) {
                query = query.eq('subject_id', subjectId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const topicsWithCount = data.map(t => ({
                ...t,
                question_count: t.questions?.[0]?.count || 0,
                questions: undefined,
            }));

            setTopics(topicsWithCount);
        } catch (error: any) {
            toast.error(`Failed to load topics: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    const createTopic = async (subjectId: string, name: string, description?: string) => {
        try {
            const { data, error } = await supabase
                .from('topics')
                .insert({ subject_id: subjectId, name, description })
                .select()
                .single();

            if (error) throw error;
            toast.success('Topic created');
            await fetchTopics();
            return data;
        } catch (error: any) {
            toast.error(`Failed to create topic: ${error.message}`);
            throw error;
        }
    };

    const updateTopic = async (id: string, updates: Partial<Topic>) => {
        try {
            const { error } = await supabase
                .from('topics')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast.success('Topic updated');
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to update topic: ${error.message}`);
            throw error;
        }
    };

    const deleteTopic = async (id: string) => {
        try {
            const { error } = await supabase
                .from('topics')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Topic deleted');
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to delete topic: ${error.message}`);
            throw error;
        }
    };

    return {
        topics,
        loading,
        refetch: fetchTopics,
        createTopic,
        updateTopic,
        deleteTopic,
    };
}

// --- Subtopics Hook ---
export function useSubtopics(topicId?: string) {
    const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubtopics = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('subtopics')
                .select(`
                    *,
                    questions:questions(count)
                `)
                .order('name');

            if (topicId) {
                query = query.eq('topic_id', topicId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const subtopicsWithCount = data.map(s => ({
                ...s,
                question_count: s.questions?.[0]?.count || 0,
                questions: undefined,
            }));

            setSubtopics(subtopicsWithCount);
        } catch (error: any) {
            toast.error(`Failed to load subtopics: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [topicId]);

    useEffect(() => {
        fetchSubtopics();
    }, [fetchSubtopics]);

    const createSubtopic = async (topicId: string, name: string, description?: string) => {
        try {
            const { data, error } = await supabase
                .from('subtopics')
                .insert({ topic_id: topicId, name, description })
                .select()
                .single();

            if (error) throw error;
            toast.success('Subtopic created');
            await fetchSubtopics();
            return data;
        } catch (error: any) {
            toast.error(`Failed to create subtopic: ${error.message}`);
            throw error;
        }
    };

    const updateSubtopic = async (id: string, updates: Partial<Subtopic>) => {
        try {
            const { error } = await supabase
                .from('subtopics')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast.success('Subtopic updated');
            await fetchSubtopics();
        } catch (error: any) {
            toast.error(`Failed to update subtopic: ${error.message}`);
            throw error;
        }
    };

    const deleteSubtopic = async (id: string) => {
        try {
            const { error } = await supabase
                .from('subtopics')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Subtopic deleted');
            await fetchSubtopics();
        } catch (error: any) {
            toast.error(`Failed to delete subtopic: ${error.message}`);
            throw error;
        }
    };

    return {
        subtopics,
        loading,
        refetch: fetchSubtopics,
        createSubtopic,
        updateSubtopic,
        deleteSubtopic,
    };
}

// Combined hook for getting full taxonomy
export function useTaxonomy() {
    const subjectsHook = useSubjects();
    const topicsHook = useTopics();
    const subtopicsHook = useSubtopics();

    return {
        subjects: subjectsHook.subjects,
        topics: topicsHook.topics,
        subtopics: subtopicsHook.subtopics,
        loading: subjectsHook.loading || topicsHook.loading || subtopicsHook.loading,
        refetchAll: async () => {
            await Promise.all([
                subjectsHook.refetch(),
                topicsHook.refetch(),
                subtopicsHook.refetch(),
            ]);
        },
    };
}
