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
    slug?: string;
}

export interface Topic {
    id: string;
    subject_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    question_count?: number;
    slug?: string;
}

export interface Subtopic {
    id: string;
    topic_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    question_count?: number;
    slug?: string;
}

const createSlug = (text: string, parentName?: string) => {
    let slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/--+/g, '-')     // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
        .trim();                  // Trim

    if (parentName) {
        const parentSlug = parentName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
        if (slug.startsWith(parentSlug + '-')) {
            slug = slug.substring(parentSlug.length + 1);
        }
    }
    return slug;
};

// --- Subjects Hook ---
export function useSubjects() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch root topics (subjects) from study_topics
            const { data, error } = await supabase
                .from('study_topics')
                .select('*')
                .is('parent_id', null)
                .order('sort_order', { ascending: true })
                .order('title', { ascending: true });

            if (error) throw error;

            // Transform study_topics to Subject interface
            const transformedSubjects: Subject[] = data.map(item => ({
                id: item.id,
                name: item.title,
                description: item.description,
                created_at: item.created_at,
                updated_at: item.updated_at || item.created_at,
                slug: item.slug
                // Note: question_count logic would need a more complex join or separate query
                // For now, we omit it or would need a custom RPC/view if critical
            }));

            setSubjects(transformedSubjects);
        } catch (error: any) {
            console.error('Error fetching subjects:', error);
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
            const slug = createSlug(name);
            const { data, error } = await supabase
                .from('study_topics')
                .insert({
                    title: name,
                    description,
                    slug,
                    parent_id: null,
                    is_published: true
                })
                .select()
                .single();

            if (error) throw error;
            toast.success('Subject created');
            await fetchSubjects();

            // Return in Subject format
            return {
                id: data.id,
                name: data.title,
                description: data.description,
                created_at: data.created_at,
                updated_at: data.updated_at
            };
        } catch (error: any) {
            toast.error(`Failed to create subject: ${error.message}`);
            throw error;
        }
    };

    const updateSubject = async (id: string, updates: Partial<Subject>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) {
                dbUpdates.title = updates.name;
                dbUpdates.slug = createSlug(updates.name);
            }
            if (updates.description !== undefined) dbUpdates.description = updates.description;

            const { error } = await supabase
                .from('study_topics')
                .update(dbUpdates)
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
                .from('study_topics')
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
                .from('study_topics')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('title', { ascending: true });

            if (subjectId) {
                query = query.eq('parent_id', subjectId);
            } else {
                // If no subjectId, we technically could fetch ALL 2nd level topics, 
                // but that's hard to distinguish from 3rd level without a join.
                // For now, let's just return empty if no subjectId is provided to be safe, 
                // OR we can fetch all non-root topics? 
                // The original hook likely returned specific topics for a subject or all topics.
                // Let's assume we need subjectId usually.
                // If subjectId is missing, maybe we shouldn't fetch anything to avoid massive lists
                if (!subjectId) {
                    setTopics([]);
                    setLoading(false);
                    return;
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            const transformedTopics: Topic[] = data.map(item => ({
                id: item.id,
                subject_id: item.parent_id!, // We know it has parent if we queried by parent_id
                name: item.title,
                description: item.description,
                created_at: item.created_at,
                updated_at: item.updated_at || item.created_at,
                slug: item.slug
            }));

            setTopics(transformedTopics);
        } catch (error: any) {
            console.error('Error fetching topics:', error);
            toast.error(`Failed to load topics: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    const createTopic = async (subjectId: string, name: string, description?: string, parentName?: string) => {
        try {
            const slug = createSlug(name, parentName);
            const { data, error } = await supabase
                .from('study_topics')
                .insert({
                    title: name,
                    description,
                    slug,
                    parent_id: subjectId,
                    is_published: true
                })
                .select()
                .single();

            if (error) throw error;
            toast.success('Topic created');
            await fetchTopics();
            return {
                id: data.id,
                subject_id: data.parent_id,
                name: data.title,
                description: data.description,
                created_at: data.created_at,
                updated_at: data.updated_at
            };
        } catch (error: any) {
            toast.error(`Failed to create topic: ${error.message}`);
            throw error;
        }
    };

    const updateTopic = async (id: string, updates: Partial<Topic>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) {
                dbUpdates.title = updates.name;
                dbUpdates.slug = createSlug(updates.name); // Should we regen slug? Usually yes if name changes.
            }
            if (updates.description !== undefined) dbUpdates.description = updates.description;

            const { error } = await supabase
                .from('study_topics')
                .update(dbUpdates)
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
                .from('study_topics')
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
            if (!topicId) {
                setSubtopics([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('study_topics')
                .select('*')
                .eq('parent_id', topicId)
                .order('sort_order', { ascending: true })
                .order('title', { ascending: true });

            if (error) throw error;

            const transformedSubtopics: Subtopic[] = data.map(item => ({
                id: item.id,
                topic_id: item.parent_id!,
                name: item.title,
                description: item.description,
                created_at: item.created_at,
                updated_at: item.updated_at || item.created_at,
                slug: item.slug
            }));

            setSubtopics(transformedSubtopics);
        } catch (error: any) {
            console.error('Error fetching subtopics:', error);
            toast.error(`Failed to load subtopics: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [topicId]);

    useEffect(() => {
        fetchSubtopics();
    }, [fetchSubtopics]);

    const createSubtopic = async (topicId: string, name: string, description?: string, parentName?: string) => {
        try {
            const slug = createSlug(name, parentName);
            const { data, error } = await supabase
                .from('study_topics')
                .insert({
                    title: name,
                    description,
                    slug,
                    parent_id: topicId,
                    is_published: true
                })
                .select()
                .single();

            if (error) throw error;
            toast.success('Subtopic created');
            await fetchSubtopics();
            return {
                id: data.id,
                topic_id: data.parent_id,
                name: data.title,
                description: data.description,
                created_at: data.created_at,
                updated_at: data.updated_at
            };
        } catch (error: any) {
            toast.error(`Failed to create subtopic: ${error.message}`);
            throw error;
        }
    };

    const updateSubtopic = async (id: string, updates: Partial<Subtopic>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) {
                dbUpdates.title = updates.name;
                dbUpdates.slug = createSlug(updates.name); // Should we regen slug? Usually yes if name changes.
            }
            if (updates.description !== undefined) dbUpdates.description = updates.description;

            const { error } = await supabase
                .from('study_topics')
                .update(dbUpdates)
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
                .from('study_topics')
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
    const topicsHook = useTopics(); // This won't fetch anything without subjectId
    const subtopicsHook = useSubtopics(); // This won't fetch anything without topicId

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
