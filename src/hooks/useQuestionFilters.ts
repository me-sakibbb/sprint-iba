import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './use-debounce';

// --- Types ---
export interface Question {
    local_id: string;
    question_text: string;
    question_text_formatted?: string;
    options: Record<string, string>; // Plain text options
    options_formatted?: Record<string, string>; // Formatted options
    correct_answer: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    explanation: string;
    explanation_formatted?: string;
    is_verified: boolean;
    has_image?: boolean;
    image_url?: string;
    image_description?: string;
    subject_id?: string;
    topic_id?: string;
    subtopic_id?: string;
    images?: Array<{ id: string; image_url: string; description?: string; image_order: number }>;
}

export interface FilterState {
    search: string;
    verificationStatus: 'all' | 'verified' | 'unverified';
    topic: string;
    subject_id: string;
    topic_id: string;
    subtopic_id: string;
    difficulty: 'all' | 'easy' | 'medium' | 'hard';
    itemsPerPage: number;
}

const DEFAULT_FILTERS: FilterState = {
    search: '',
    verificationStatus: 'unverified',
    topic: '',
    subject_id: '',
    topic_id: '',
    subtopic_id: '',
    difficulty: 'all',
    itemsPerPage: 10,
};

// --- Hook ---
export function useQuestionFilters(initialFilters: Partial<FilterState> = {}) {
    const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);

    const debouncedSearch = useDebounce(filters.search, 500);

    // Fetch available topics for filter dropdown
    const fetchTopics = useCallback(async () => {
        const { data } = await supabase
            .from('questions')
            .select('topic')
            .not('topic', 'is', null);

        if (data) {
            const uniqueTopics = Array.from(new Set(data.map((q: any) => q.topic).filter(Boolean)));
            setAvailableTopics(uniqueTopics.sort());
        }
    }, []);

    // Main fetch function
    const fetchQuestions = useCallback(async (page = 1) => {
        setLoading(true);

        try {
            let query = supabase
                .from('questions')
                .select('*', { count: 'exact' });

            // Apply verification filter
            if (filters.verificationStatus === 'verified') {
                query = query.eq('is_verified', true);
            } else if (filters.verificationStatus === 'unverified') {
                query = query.eq('is_verified', false);
            }

            // Apply topic filter (legacy string)
            if (filters.topic) {
                query = query.eq('topic', filters.topic);
            }

            // Apply taxonomy filters (IDs)
            if (filters.subject_id) {
                query = query.eq('subject_id', filters.subject_id);
            }
            if (filters.topic_id) {
                query = query.eq('topic_id', filters.topic_id);
            }
            if (filters.subtopic_id) {
                query = query.eq('subtopic_id', filters.subtopic_id);
            }

            // Apply difficulty filter
            if (filters.difficulty !== 'all') {
                query = query.eq('difficulty', filters.difficulty);
            }

            // Apply search filter
            if (debouncedSearch) {
                query = query.ilike('question_text', `%${debouncedSearch}%`);
            }

            // Get count first
            const { count, error: countError } = await query;
            if (countError) throw countError;

            setTotalCount(count || 0);
            setTotalPages(Math.ceil((count || 0) / filters.itemsPerPage));

            // Fetch paginated data
            const from = (page - 1) * filters.itemsPerPage;
            const to = from + filters.itemsPerPage - 1;

            let dataQuery = supabase
                .from('questions')
                .select('*, question_images(*)');

            // Reapply filters for data query
            if (filters.verificationStatus === 'verified') {
                dataQuery = dataQuery.eq('is_verified', true);
            } else if (filters.verificationStatus === 'unverified') {
                dataQuery = dataQuery.eq('is_verified', false);
            }

            if (filters.topic) {
                dataQuery = dataQuery.eq('topic', filters.topic);
            }

            if (filters.subject_id) {
                dataQuery = dataQuery.eq('subject_id', filters.subject_id);
            }
            if (filters.topic_id) {
                dataQuery = dataQuery.eq('topic_id', filters.topic_id);
            }
            if (filters.subtopic_id) {
                dataQuery = dataQuery.eq('subtopic_id', filters.subtopic_id);
            }

            if (filters.difficulty !== 'all') {
                dataQuery = dataQuery.eq('difficulty', filters.difficulty);
            }

            if (debouncedSearch) {
                dataQuery = dataQuery.ilike('question_text', `%${debouncedSearch}%`);
            }

            const { data, error } = await dataQuery
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const formattedQuestions: Question[] = (data || []).map((q: any) => {
                // Convert array options to labeled object (plain text)
                const optionsObj: Record<string, string> = {};
                const labels = ['A', 'B', 'C', 'D', 'E'];
                if (Array.isArray(q.options)) {
                    q.options.forEach((opt: string, idx: number) => {
                        if (idx < labels.length) {
                            optionsObj[labels[idx]] = opt;
                        }
                    });
                } else if (typeof q.options === 'object') {
                    Object.assign(optionsObj, q.options);
                }

                // Convert formatted options array to labeled object
                const optionsFormattedObj: Record<string, string> = {};
                if (Array.isArray(q.options_formatted)) {
                    q.options_formatted.forEach((opt: string, idx: number) => {
                        if (idx < labels.length) {
                            optionsFormattedObj[labels[idx]] = opt;
                        }
                    });
                }

                // Convert numeric correct_answer to letter label
                let correctAnswer = q.correct_answer;
                if (correctAnswer && !isNaN(Number(correctAnswer))) {
                    const index = parseInt(correctAnswer);
                    correctAnswer = labels[index] || correctAnswer;
                }

                return {
                    local_id: q.id,
                    question_text: q.question_text,
                    question_text_formatted: q.question_text_formatted || q.question_text,
                    options: optionsObj,
                    options_formatted: Object.keys(optionsFormattedObj).length > 0 ? optionsFormattedObj : optionsObj,
                    correct_answer: correctAnswer,
                    topic: q.topic || '',
                    subtopic: q.subtopic || '',
                    difficulty: q.difficulty || 'medium',
                    explanation: q.explanation || '',
                    explanation_formatted: q.explanation_formatted || q.explanation,
                    is_verified: q.is_verified,
                    has_image: q.has_image || false,
                    image_url: q.image_url || null,
                    image_description: q.image_description || null,
                    subject_id: q.subject_id,
                    topic_id: q.topic_id,
                    subtopic_id: q.subtopic_id,
                    images: q.question_images || [],
                };
            });

            setQuestions(formattedQuestions);
            setCurrentPage(page);
        } catch (error: any) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    }, [filters.verificationStatus, filters.topic, filters.subject_id, filters.topic_id, filters.subtopic_id, filters.difficulty, filters.itemsPerPage, debouncedSearch]);

    // Refetch when filters change
    useEffect(() => {
        fetchQuestions(1);
    }, [fetchQuestions]);

    // Load topics on mount
    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    // Update a single filter
    const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to page 1 when filter changes
    }, []);

    // Reset all filters
    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setCurrentPage(1);
    }, []);

    // Go to specific page
    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            fetchQuestions(page);
        }
    }, [fetchQuestions, totalPages]);

    // Update a question locally
    const updateQuestionLocally = useCallback((id: string, key: string, value: any) => {
        setQuestions(prev => prev.map(q =>
            q.local_id === id ? { ...q, [key]: value } : q
        ));
    }, []);

    // Remove a question locally
    const removeQuestionLocally = useCallback((id: string) => {
        setQuestions(prev => prev.filter(q => q.local_id !== id));
    }, []);

    return {
        // State
        questions,
        filters,
        loading,
        currentPage,
        totalPages,
        totalCount,
        availableTopics,

        // Actions
        updateFilter,
        resetFilters,
        goToPage,
        refetch: () => fetchQuestions(currentPage),
        updateQuestionLocally,
        removeQuestionLocally,
    };
}
