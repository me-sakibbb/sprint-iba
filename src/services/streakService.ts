// ============================================
// Streak Management Service
// Handles login and practice streak tracking
// ============================================

import { supabase } from '@/integrations/supabase/client';

export interface UserStreak {
    id: string;
    user_id: string;
    login_streak_count: number;
    login_streak_last_date: string | null;
    practice_streak_count: number;
    practice_streak_last_date: string | null;
    longest_login_streak: number;
    longest_practice_streak: number;
    created_at: string;
    updated_at: string;
}

/**
 * Get or create user streak record
 */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
    try {
        const { data, error } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create new streak record
            const { data: newData, error: insertError } = await supabase
                .from('user_streaks')
                .insert({
                    user_id: userId,
                    login_streak_count: 0,
                    practice_streak_count: 0,
                    longest_login_streak: 0,
                    longest_practice_streak: 0,
                })
                .select()
                .single();

            if (insertError) throw insertError;
            return newData as UserStreak;
        }

        if (error) throw error;
        return data as UserStreak;
    } catch (error) {
        console.error('Error getting user streak:', error);
        return null;
    }
}

/**
 * Update login streak and award points
 * Uses server-side RPC for security
 */
export async function updateLoginStreak(userId: string): Promise<{
    streakCount: number;
    vpAwarded: number;
    leveledUp: boolean;
    multiplier: number;
    basePoints: number;
    bonusPoints: number;
    nextMilestone: number | null;
}> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('process_login_streak');

        if (error) throw error;

        return {
            streakCount: data?.streakCount || 0,
            vpAwarded: data?.vpAwarded || 0,
            leveledUp: data?.leveledUp || false,
            multiplier: data?.multiplier || 1.0,
            basePoints: data?.basePoints || 0,
            bonusPoints: data?.bonusPoints || 0,
            nextMilestone: data?.nextMilestone || null,
        };
    } catch (error) {
        console.error('Error updating login streak:', error);
        return {
            streakCount: 0,
            vpAwarded: 0,
            leveledUp: false,
            multiplier: 1.0,
            basePoints: 0,
            bonusPoints: 0,
            nextMilestone: null,
        };
    }
}

/**
 * Update practice streak after completing a session
 * Uses server-side RPC for security
 */
export async function updatePracticeStreak(
    userId: string,
    questionsAnswered: number
): Promise<{
    streakCount: number;
    vpAwarded: number;
    multiplier: number;
    basePoints: number;
    bonusPoints: number;
    nextMilestone: number | null;
}> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('process_practice_streak', {
            p_questions_answered: questionsAnswered
        });

        if (error) throw error;

        return {
            streakCount: data?.streakCount || 0,
            vpAwarded: data?.vpAwarded || 0,
            multiplier: data?.multiplier || 1.0,
            basePoints: data?.basePoints || 0,
            bonusPoints: data?.bonusPoints || 0,
            nextMilestone: data?.nextMilestone || null,
        };
    } catch (error) {
        console.error('Error updating practice streak:', error);
        return {
            streakCount: 0,
            vpAwarded: 0,
            multiplier: 1.0,
            basePoints: 0,
            bonusPoints: 0,
            nextMilestone: null,
        };
    }
}

/**
 * Get streak statistics for display
 */
export async function getStreakStats(userId: string): Promise<{
    loginStreak: number;
    practiceStreak: number;
    longestLogin: number;
    longestPractice: number;
    currentMultiplier: number;
} | null> {
    try {
        const streak = await getUserStreak(userId);
        if (!streak) return null;

        const { calculateStreakMultiplier } = await import('@/utils/pointCalculations');
        const multiplier = await calculateStreakMultiplier(
            streak.login_streak_count,
            streak.practice_streak_count
        );

        return {
            loginStreak: streak.login_streak_count,
            practiceStreak: streak.practice_streak_count,
            longestLogin: streak.longest_login_streak,
            longestPractice: streak.longest_practice_streak,
            currentMultiplier: multiplier,
        };
    } catch (error) {
        console.error('Error getting streak stats:', error);
        return null;
    }
}
