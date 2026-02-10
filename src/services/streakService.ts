// ============================================
// Streak Management Service
// Handles login and practice streak tracking
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { getPointConfig } from '@/utils/pointCalculations';

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
        let { data, error } = await supabase
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
 * Check if dates are consecutive days
 */
function isConsecutiveDay(lastDateStr: string | null): boolean {
    if (!lastDateStr) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(lastDateStr);
    lastDate.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return lastDate.getTime() === yesterday.getTime();
}

/**
 * Check if it's the same day
 */
function isSameDay(lastDateStr: string | null): boolean {
    if (!lastDateStr) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(lastDateStr);
    lastDate.setHours(0, 0, 0, 0);

    return lastDate.getTime() === today.getTime();
}

/**
 * Update login streak and award points
 */
export async function updateLoginStreak(userId: string): Promise<{
    streakCount: number;
    vpAwarded: number;
    leveledUp: boolean;
}> {
    try {
        const streak = await getUserStreak(userId);
        if (!streak) throw new Error('Failed to get user streak');

        const config = await getPointConfig();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if already logged in today
        if (isSameDay(streak.login_streak_last_date)) {
            return {
                streakCount: streak.login_streak_count,
                vpAwarded: 0,
                leveledUp: false,
            };
        }

        let newStreakCount = 1;

        // Check if consecutive day
        if (isConsecutiveDay(streak.login_streak_last_date)) {
            newStreakCount = streak.login_streak_count + 1;
        }

        const newLongestStreak = Math.max(newStreakCount, streak.longest_login_streak);

        // Update streak in database
        const { error: updateError } = await supabase
            .from('user_streaks')
            .update({
                login_streak_count: newStreakCount,
                login_streak_last_date: today,
                longest_login_streak: newLongestStreak,
            })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        // Award streak bonus VP
        const vpAwarded = config.login_streak_daily;

        // Record VP transaction
        await awardStreakPoints(userId, vpAwarded, 'login_streak', {
            streak_count: newStreakCount,
            date: today,
        });

        return {
            streakCount: newStreakCount,
            vpAwarded,
            leveledUp: false, // Will be determined by awardVP function
        };
    } catch (error) {
        console.error('Error updating login streak:', error);
        return { streakCount: 0, vpAwarded: 0, leveledUp: false };
    }
}

/**
 * Update practice streak after completing a session
 */
export async function updatePracticeStreak(
    userId: string,
    questionsAnswered: number
): Promise<{
    streakCount: number;
    vpAwarded: number;
}> {
    try {
        const config = await getPointConfig();

        // Only count if user answered minimum questions
        if (questionsAnswered < config.min_practice_questions) {
            return { streakCount: 0, vpAwarded: 0 };
        }

        const streak = await getUserStreak(userId);
        if (!streak) throw new Error('Failed to get user streak');

        const today = new Date().toISOString().split('T')[0];

        // Check if already practiced today
        if (isSameDay(streak.practice_streak_last_date)) {
            return {
                streakCount: streak.practice_streak_count,
                vpAwarded: 0,
            };
        }

        let newStreakCount = 1;

        // Check if consecutive day
        if (isConsecutiveDay(streak.practice_streak_last_date)) {
            newStreakCount = streak.practice_streak_count + 1;
        }

        const newLongestStreak = Math.max(newStreakCount, streak.longest_practice_streak);

        // Update streak in database
        const { error: updateError } = await supabase
            .from('user_streaks')
            .update({
                practice_streak_count: newStreakCount,
                practice_streak_last_date: today,
                longest_practice_streak: newLongestStreak,
            })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        // Award streak bonus VP
        const vpAwarded = config.practice_streak_daily;

        await awardStreakPoints(userId, vpAwarded, 'practice_streak', {
            streak_count: newStreakCount,
            questions_answered: questionsAnswered,
            date: today,
        });

        return {
            streakCount: newStreakCount,
            vpAwarded,
        };
    } catch (error) {
        console.error('Error updating practice streak:', error);
        return { streakCount: 0, vpAwarded: 0 };
    }
}

/**
 * Award streak bonus points
 */
async function awardStreakPoints(
    userId: string,
    amount: number,
    reason: 'login_streak' | 'practice_streak',
    metadata: Record<string, any>
): Promise<void> {
    try {
        // Insert VP transaction
        const { error: vpError } = await supabase
            .from('velocity_points')
            .insert({
                user_id: userId,
                amount,
                reason,
                metadata,
            });

        if (vpError) throw vpError;

        // Update total VP
        const { data: currentLevel, error: levelError } = await supabase
            .from('user_levels')
            .select('total_vp')
            .eq('user_id', userId)
            .single();

        if (levelError && levelError.code !== 'PGRST116') throw levelError;

        const currentVP = currentLevel?.total_vp || 0;
        const newTotalVP = currentVP + amount;

        await supabase
            .from('user_levels')
            .upsert({
                user_id: userId,
                total_vp: newTotalVP,
            });
    } catch (error) {
        console.error('Error awarding streak points:', error);
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
