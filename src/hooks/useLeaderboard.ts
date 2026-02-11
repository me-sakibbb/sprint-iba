// ============================================
// useLeaderboard Hook
// Custom hook for managing global leaderboard data with pagination, search, and real-time updates
// ============================================

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaderboardEntry {
    user_id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    total_vp: number;
    current_level: number;
    level_name: string | null;
    level_color: string | null;
    level_icon_url: string | null;
    global_rank: number;
    total_users: number;
    login_streak: number;
    practice_streak: number;
}

interface UserRankData extends LeaderboardEntry { }

interface LeaderboardState {
    entries: LeaderboardEntry[];
    userRank: UserRankData | null;
    loading: boolean;
    loadingMore: boolean;
    error: Error | null;
    hasMore: boolean;
    totalUsers: number;
}

interface UseLeaderboardOptions {
    initialLimit?: number;
    pageSize?: number;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
    const { initialLimit = 50, pageSize = 20 } = options;
    const { user } = useAuth();

    const [state, setState] = useState<LeaderboardState>({
        entries: [],
        userRank: null,
        loading: true,
        loadingMore: false,
        error: null,
        hasMore: true,
        totalUsers: 0,
    });

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [timeFilter, setTimeFilter] = useState<'all_time' | 'weekly' | 'monthly'>('all_time');

    // Track current offset for pagination
    const offsetRef = useRef(0);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    /**
     * Fetch leaderboard data from the database
     */
    const fetchLeaderboard = useCallback(async (
        limit: number,
        offset: number,
        search: string | null,
        append: boolean = false
    ) => {
        try {
            setState(prev => ({
                ...prev,
                loading: !append,
                loadingMore: append,
                error: null,
            }));

            // Call the database function
            const { data, error } = await supabase.rpc('get_global_leaderboard', {
                p_limit: limit,
                p_offset: offset,
                p_search: search || null,
                p_time_filter: timeFilter,
            });

            if (error) throw error;

            const entries = (data || []) as LeaderboardEntry[];
            const totalUsers = entries.length > 0 ? entries[0].total_users : 0;
            const hasMore = entries.length === limit;

            setState(prev => ({
                ...prev,
                entries: append ? [...prev.entries, ...entries] : entries,
                totalUsers,
                hasMore,
                loading: false,
                loadingMore: false,
            }));

            return entries;
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                loadingMore: false,
                error: error as Error,
            }));
            toast.error('Failed to load leaderboard');
            return [];
        }
    }, [timeFilter]);

    /**
     * Fetch current user's rank
     */
    const fetchUserRank = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase.rpc('get_user_rank', {
                p_user_id: user.id,
            });

            if (error) throw error;

            const userRankData = data && data.length > 0 ? (data[0] as UserRankData) : null;

            setState(prev => ({
                ...prev,
                userRank: userRankData,
            }));
        } catch (error) {
            console.error('Error fetching user rank:', error);
        }
    }, [user]);

    /**
     * Load initial data
     */
    const loadInitial = useCallback(async () => {
        offsetRef.current = 0;
        await fetchLeaderboard(initialLimit, 0, searchQuery || null, false);
        if (user) {
            await fetchUserRank();
        }
    }, [fetchLeaderboard, fetchUserRank, initialLimit, searchQuery, user]);

    /**
     * Load more entries (pagination)
     */
    const loadMore = useCallback(async () => {
        if (state.loadingMore || !state.hasMore) return;

        offsetRef.current += pageSize;
        await fetchLeaderboard(pageSize, offsetRef.current, searchQuery || null, true);
    }, [fetchLeaderboard, pageSize, searchQuery, state.loadingMore, state.hasMore]);

    /**
     * Handle search with debouncing
     */
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search
        searchTimeoutRef.current = setTimeout(() => {
            offsetRef.current = 0;
            fetchLeaderboard(initialLimit, 0, query || null, false);
        }, 500);
    }, [fetchLeaderboard, initialLimit]);

    /**
     * Change time filter
     */
    const handleTimeFilterChange = useCallback((filter: 'all_time' | 'weekly' | 'monthly') => {
        setTimeFilter(filter);
        offsetRef.current = 0;
    }, []);

    /**
     * Refresh leaderboard
     */
    const refresh = useCallback(() => {
        loadInitial();
    }, [loadInitial]);

    /**
     * Subscribe to real-time updates
     */
    useEffect(() => {
        const channel = supabase
            .channel('leaderboard-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_levels',
                },
                () => {
                    // Refresh leaderboard when any user's VP changes
                    refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refresh]);

    /**
     * Load initial data and refetch when time filter changes
     */
    useEffect(() => {
        loadInitial();
    }, [loadInitial, timeFilter]);

    /**
     * Cleanup search timeout on unmount
     */
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    return {
        entries: state.entries,
        userRank: state.userRank,
        loading: state.loading,
        loadingMore: state.loadingMore,
        error: state.error,
        hasMore: state.hasMore,
        totalUsers: state.totalUsers,
        searchQuery,
        timeFilter,
        handleSearch,
        handleTimeFilterChange,
        loadMore,
        refresh,
    };
}
