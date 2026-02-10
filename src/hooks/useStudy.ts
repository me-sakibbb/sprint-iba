import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type StudyTopic = Tables<'study_topics'>;
type StudyMaterial = Tables<'study_materials'>;
type StudyUserProgress = Tables<'study_user_progress'>;

export interface StudyTopicWithChildren extends StudyTopic {
    children: StudyTopicWithChildren[];
    materials_count: number;
    question_count: number;
}

export interface StudyTopicWithMaterials extends StudyTopic {
    materials: StudyMaterial[];
}

export interface StudyProgressMap {
    [topicId: string]: StudyUserProgress;
}

// ─── Fetch all published study topics in tree structure ─────────────
import { useQuery } from '@tanstack/react-query';

// ─── Fetch all published study topics in tree structure ─────────────
export function useStudyTopics() {
    const { data: topics = [], isLoading: loading, refetch, error } = useQuery({
        queryKey: ['study-topics'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('study_topics')
                .select('*')
                .eq('is_published', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            // Build tree structure
            const topicMap = new Map<string, StudyTopicWithChildren>();
            const roots: StudyTopicWithChildren[] = [];

            // First pass: create enriched objects
            (data || []).forEach(topic => {
                topicMap.set(topic.id, {
                    ...topic,
                    children: [],
                    materials_count: 0,
                    question_count: 0,
                });
            });

            // Second pass: build tree
            topicMap.forEach(topic => {
                if (topic.parent_id && topicMap.has(topic.parent_id)) {
                    topicMap.get(topic.parent_id)!.children.push(topic);
                } else {
                    roots.push(topic);
                }
            });

            // Fetch material counts for each topic
            const { data: materialCounts } = await supabase
                .from('study_materials')
                .select('study_topic_id')
                .eq('is_published', true);

            if (materialCounts) {
                const countMap: Record<string, number> = {};
                materialCounts.forEach((m: any) => {
                    countMap[m.study_topic_id] = (countMap[m.study_topic_id] || 0) + 1;
                });
                topicMap.forEach(topic => {
                    topic.materials_count = countMap[topic.id] || 0;
                });
            }

            // Fetch question counts by topic_name
            const topicNames = (data || [])
                .filter(t => t.topic_name)
                .map(t => t.topic_name!);

            if (topicNames.length > 0) {
                const { data: questions } = await supabase
                    .from('questions')
                    .select('topic')
                    .in('topic', topicNames)
                    .eq('is_verified', true);

                if (questions) {
                    const qCountMap: Record<string, number> = {};
                    questions.forEach((q: any) => {
                        qCountMap[q.topic] = (qCountMap[q.topic] || 0) + 1;
                    });
                    topicMap.forEach(topic => {
                        if (topic.topic_name) {
                            topic.question_count = qCountMap[topic.topic_name] || 0;
                        }
                    });
                }
            }

            return roots;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    });

    return { topics, loading, refetch, error };
}

// ─── Fetch a single study topic by slug with its materials ─────────
// ─── Fetch a single study topic by slug with its materials ─────────
export function useStudyTopic(slug: string) {
    const { data, isLoading: loading, refetch, error } = useQuery({
        queryKey: ['study-topic', slug],
        queryFn: async () => {
            if (!slug) return { topic: null, subtopics: [] };

            // Fetch the topic
            const { data: topicData, error: topicError } = await supabase
                .from('study_topics')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();

            if (topicError) throw topicError;

            // Parallel fetch: materials and subtopics
            const [materialsResult, childrenResult] = await Promise.all([
                supabase
                    .from('study_materials')
                    .select('*')
                    .eq('study_topic_id', topicData.id)
                    .eq('is_published', true)
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('study_topics')
                    .select('*')
                    .eq('parent_id', topicData.id)
                    .eq('is_published', true)
                    .order('sort_order', { ascending: true })
            ]);

            if (materialsResult.error) throw materialsResult.error;

            const topicWithMaterials: StudyTopicWithMaterials = {
                ...topicData,
                materials: materialsResult.data || [],
            };

            return {
                topic: topicWithMaterials,
                subtopics: childrenResult.data || []
            };
        },
        enabled: !!slug,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        topic: data?.topic || null,
        subtopics: data?.subtopics || [],
        loading,
        refetch,
        error
    };
}

// ─── User progress tracking ────────────────────────────────────────
export function useStudyProgress() {
    const { user } = useAuth();
    const [progress, setProgress] = useState<StudyProgressMap>({});
    const [loading, setLoading] = useState(true);

    const fetchProgress = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('study_user_progress')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            const map: StudyProgressMap = {};
            (data || []).forEach(p => {
                map[p.study_topic_id] = p;
            });
            setProgress(map);
        } catch (error: any) {
            console.error('Error fetching study progress:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProgress();
    }, [fetchProgress]);

    const markMaterialRead = useCallback(async (materialId: string, topicId: string) => {
        if (!user) return;

        try {
            const existing = progress[topicId];

            if (existing) {
                // Check if already marked
                if (existing.materials_read.includes(materialId)) return;

                const updatedRead = [...existing.materials_read, materialId];
                const { error } = await supabase
                    .from('study_user_progress')
                    .update({
                        materials_read: updatedRead,
                        last_accessed_at: new Date().toISOString(),
                    } as any)
                    .eq('id', existing.id);

                if (error) throw error;

                setProgress(prev => ({
                    ...prev,
                    [topicId]: { ...existing, materials_read: updatedRead },
                }));
            } else {
                // Create new progress record
                const { data, error } = await supabase
                    .from('study_user_progress')
                    .insert({
                        user_id: user.id,
                        study_topic_id: topicId,
                        materials_read: [materialId],
                    } as any)
                    .select()
                    .single();

                if (error) throw error;

                setProgress(prev => ({
                    ...prev,
                    [topicId]: data,
                }));
            }

            toast.success('Progress updated');
        } catch (error: any) {
            console.error('Error marking material read:', error);
            toast.error('Failed to update progress');
        }
    }, [user, progress]);

    const updatePracticeProgress = useCallback(async (
        topicId: string,
        attempted: number,
        correct: number
    ) => {
        if (!user) return;

        try {
            const existing = progress[topicId];

            if (existing) {
                const { error } = await supabase
                    .from('study_user_progress')
                    .update({
                        practice_attempted: existing.practice_attempted + attempted,
                        practice_correct: existing.practice_correct + correct,
                        last_accessed_at: new Date().toISOString(),
                    } as any)
                    .eq('id', existing.id);

                if (error) throw error;

                setProgress(prev => ({
                    ...prev,
                    [topicId]: {
                        ...existing,
                        practice_attempted: existing.practice_attempted + attempted,
                        practice_correct: existing.practice_correct + correct,
                    },
                }));
            } else {
                const { data, error } = await supabase
                    .from('study_user_progress')
                    .insert({
                        user_id: user.id,
                        study_topic_id: topicId,
                        practice_attempted: attempted,
                        practice_correct: correct,
                    } as any)
                    .select()
                    .single();

                if (error) throw error;

                setProgress(prev => ({
                    ...prev,
                    [topicId]: data,
                }));
            }
        } catch (error: any) {
            console.error('Error updating practice progress:', error);
        }
    }, [user, progress]);

    const markTopicComplete = useCallback(async (topicId: string) => {
        if (!user) return;

        try {
            const existing = progress[topicId];

            if (existing) {
                const { error } = await supabase
                    .from('study_user_progress')
                    .update({ is_completed: true } as any)
                    .eq('id', existing.id);

                if (error) throw error;

                setProgress(prev => ({
                    ...prev,
                    [topicId]: { ...existing, is_completed: true },
                }));
            } else {
                const { data, error } = await supabase
                    .from('study_user_progress')
                    .insert({
                        user_id: user.id,
                        study_topic_id: topicId,
                        is_completed: true,
                    } as any)
                    .select()
                    .single();

                if (error) throw error;

                setProgress(prev => ({
                    ...prev,
                    [topicId]: data,
                }));
            }

            toast.success('Topic marked as complete!');
        } catch (error: any) {
            console.error('Error marking topic complete:', error);
            toast.error('Failed to mark topic as complete');
        }
    }, [user, progress]);

    return {
        progress,
        loading,
        refetch: fetchProgress,
        markMaterialRead,
        updatePracticeProgress,
        markTopicComplete,
    };
}
