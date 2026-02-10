import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type StudyTopic = Tables<'study_topics'>;
type StudyMaterial = Tables<'study_materials'>;

export interface AdminStudyTopic extends StudyTopic {
    children: AdminStudyTopic[];
    materials: StudyMaterial[];
}

// ─── Generate URL-safe slug from title ────────────────────────────
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// ─── Admin Study Topics Hook ──────────────────────────────────────
export function useStudyAdmin() {
    const [topics, setTopics] = useState<AdminStudyTopic[]>([]);
    const [allTopics, setAllTopics] = useState<StudyTopic[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTopics = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch ALL topics (including unpublished)
            const { data: topicsData, error: topicsError } = await supabase
                .from('study_topics')
                .select('*')
                .order('sort_order', { ascending: true });

            if (topicsError) throw topicsError;

            // Fetch ALL materials
            const { data: materialsData, error: materialsError } = await supabase
                .from('study_materials')
                .select('*')
                .order('sort_order', { ascending: true });

            if (materialsError) throw materialsError;

            setAllTopics(topicsData || []);

            // Build tree
            const topicMap = new Map<string, AdminStudyTopic>();
            const roots: AdminStudyTopic[] = [];

            (topicsData || []).forEach(topic => {
                topicMap.set(topic.id, {
                    ...topic,
                    children: [],
                    materials: (materialsData || []).filter(m => m.study_topic_id === topic.id),
                });
            });

            topicMap.forEach(topic => {
                if (topic.parent_id && topicMap.has(topic.parent_id)) {
                    topicMap.get(topic.parent_id)!.children.push(topic);
                } else {
                    roots.push(topic);
                }
            });

            setTopics(roots);
        } catch (error: any) {
            toast.error(`Failed to load study topics: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    // ─── Create Topic ─────────────────────────────────────────────
    const createTopic = async (data: {
        title: string;
        description?: string;
        icon_name?: string;
        color?: string;
        parent_id?: string | null;
        topic_name?: string;
        subtopic_name?: string;
        is_published?: boolean;
    }) => {
        try {
            const slug = generateSlug(data.title);

            // Get max sort_order
            const maxOrder = allTopics.reduce((max, t) => Math.max(max, t.sort_order), 0);

            const { data: newTopic, error } = await supabase
                .from('study_topics')
                .insert({
                    ...data,
                    slug,
                    sort_order: maxOrder + 1,
                } as any)
                .select()
                .single();

            if (error) throw error;

            toast.success('Topic created successfully');
            await fetchTopics();
            return newTopic;
        } catch (error: any) {
            toast.error(`Failed to create topic: ${error.message}`);
            throw error;
        }
    };

    // ─── Update Topic ─────────────────────────────────────────────
    const updateTopic = async (id: string, updates: Partial<StudyTopic>) => {
        try {
            // If title changed, update slug too
            if (updates.title) {
                (updates as any).slug = generateSlug(updates.title);
            }

            const { error } = await supabase
                .from('study_topics')
                .update(updates as any)
                .eq('id', id);

            if (error) throw error;

            toast.success('Topic updated');
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to update topic: ${error.message}`);
            throw error;
        }
    };

    // ─── Delete Topic ─────────────────────────────────────────────
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

    // ─── Toggle Publish ────────────────────────────────────────────
    const togglePublish = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('study_topics')
                .update({ is_published: !currentState } as any)
                .eq('id', id);

            if (error) throw error;

            toast.success(currentState ? 'Topic unpublished' : 'Topic published');
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to toggle publish: ${error.message}`);
        }
    };

    // ─── Reorder Topics ───────────────────────────────────────────
    const reorderTopics = async (orderedIds: string[]) => {
        try {
            const updates = orderedIds.map((id, index) =>
                supabase
                    .from('study_topics')
                    .update({ sort_order: index } as any)
                    .eq('id', id)
            );

            await Promise.all(updates);
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to reorder: ${error.message}`);
        }
    };

    // ─── Create Material ──────────────────────────────────────────
    const createMaterial = async (data: {
        study_topic_id: string;
        title: string;
        content?: string;
        type?: 'note' | 'reading' | 'link' | 'video';
        url?: string;
    }) => {
        try {
            // Get max sort_order for this topic's materials
            const topicMaterials = topics
                .flatMap(t => [...t.materials, ...t.children.flatMap(c => c.materials)])
                .filter(m => m.study_topic_id === data.study_topic_id);

            const maxOrder = topicMaterials.reduce((max, m) => Math.max(max, m.sort_order), 0);

            const { data: newMaterial, error } = await supabase
                .from('study_materials')
                .insert({
                    ...data,
                    sort_order: maxOrder + 1,
                } as any)
                .select()
                .single();

            if (error) throw error;

            toast.success('Material created');
            await fetchTopics();
            return newMaterial;
        } catch (error: any) {
            toast.error(`Failed to create material: ${error.message}`);
            throw error;
        }
    };

    // ─── Update Material ──────────────────────────────────────────
    const updateMaterial = async (id: string, updates: Partial<StudyMaterial>) => {
        try {
            const { error } = await supabase
                .from('study_materials')
                .update(updates as any)
                .eq('id', id);

            if (error) throw error;

            toast.success('Material updated');
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to update material: ${error.message}`);
            throw error;
        }
    };

    // ─── Delete Material ──────────────────────────────────────────
    const deleteMaterial = async (id: string) => {
        try {
            const { error } = await supabase
                .from('study_materials')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Material deleted');
            await fetchTopics();
        } catch (error: any) {
            toast.error(`Failed to delete material: ${error.message}`);
            throw error;
        }
    };

    return {
        topics,
        allTopics,
        loading,
        refetch: fetchTopics,
        createTopic,
        updateTopic,
        deleteTopic,
        togglePublish,
        reorderTopics,
        createMaterial,
        updateMaterial,
        deleteMaterial,
    };
}
