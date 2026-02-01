// ============================================
// usePoints Hook (Enhanced from useVelocityPoints)
// Manages points, levels, and streaks with real-time updates
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateLevel, getLevelById, type LevelDefinition } from '@/config/levels';
import { toast } from 'sonner';
import {
    calculateAnswerPoints,
    calculateSessionBonus,
    calculateStreakMultiplier,
    applyMultiplier,
    ensureNonNegative,
} from '@/utils/pointCalculations';
import { getUserStreak, updateLoginStreak, getStreakStats } from '@/services/streakService';

export interface PointsData {
    totalVp: number;
    currentLevel: LevelDefinition;
    loading: boolean;
    error: Error | null;
    loginStreak: number;
    practiceStreak: number;
    streakMultiplier: number;
}

export interface AwardPointsParams {
    amount: number;
    reason:
    | 'correct_answer'
    | 'wrong_answer'
    | 'session_complete'
    | 'perfect_score'
    | 'high_score'
    | 'speed_bonus'
    | 'exam_complete'
    | 'login_streak'
    | 'practice_streak'
    | 'streak_multiplier'
    | 'manual_adjustment';
    questionId?: string;
    metadata?: Record<string, any>;
    applyStreakMultiplier?: boolean;
}

export function usePoints() {
    const { user } = useAuth();
    const [data, setData] = useState<PointsData>({
        totalVp: 0,
        currentLevel: getLevelById(1)!,
        loading: true,
        error: null,
        loginStreak: 0,
        practiceStreak: 0,
        streakMultiplier: 1.0,
    });

    const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
    const [levelUpData, setLevelUpData] = useState<LevelDefinition | null>(null);

    /**
     * Fetch user's VP, level, and streak data
     */
    const fetchPoints = useCallback(async () => {
        if (!user) {
            setData((prev) => ({ ...prev, loading: false }));
            return;
        }

        try {
            // Fetch user level data
            const { data: userLevelData, error: levelError } = await supabase
                .from('user_levels' as any)
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (levelError && levelError.code !== 'PGRST116') {
                throw levelError;
            }

            // Create level record if doesn't exist
            let totalVp = 0;
            let currentLevelId = 1;

            if (!userLevelData) {
                const { error: insertError } = await supabase
                    .from('user_levels' as any)
                    .insert({
                        user_id: user.id,
                        current_level: 1,
                        total_vp: 0,
                    });

                if (insertError) throw insertError;
            } else {
                totalVp = (userLevelData as any).total_vp || 0;
                currentLevelId = (userLevelData as any).current_level || 1;
            }

            // Fetch streak data
            const streakStats = await getStreakStats(user.id);

            const currentLevel = getLevelById(currentLevelId) || getLevelById(1)!;

            setData({
                totalVp,
                currentLevel,
                loading: false,
                error: null,
                loginStreak: streakStats?.loginStreak || 0,
                practiceStreak: streakStats?.practiceStreak || 0,
                streakMultiplier: streakStats?.currentMultiplier || 1.0,
            });
        } catch (error) {
            console.error('Error fetching points:', error);
            setData((prev) => ({
                ...prev,
                loading: false,
                error: error as Error,
            }));
        }
    }, [user]);

    /**
     * Award points to user with optional streak multiplier
     */
    const awardPoints = useCallback(
        async ({
            amount,
            reason,
            questionId,
            metadata,
            applyStreakMultiplier = false,
        }: AwardPointsParams): Promise<boolean> => {
            if (!user) return false;

            try {
                let finalAmount = amount;

                // Apply streak multiplier if requested
                if (applyStreakMultiplier && data.streakMultiplier > 1.0) {
                    const multipliedAmount = applyMultiplier(amount, data.streakMultiplier);
                    const bonusAmount = multipliedAmount - amount;

                    // Record the bonus separately
                    if (bonusAmount > 0) {
                        await supabase.from('velocity_points' as any).insert({
                            user_id: user.id,
                            amount: bonusAmount,
                            reason: 'streak_multiplier',
                            metadata: {
                                original_amount: amount,
                                multiplier: data.streakMultiplier,
                                base_reason: reason,
                            },
                        });
                    }

                    finalAmount = multipliedAmount;
                }

                // Ensure non-negative if deducting points
                if (amount < 0) {
                    finalAmount = await ensureNonNegative(data.totalVp, finalAmount);
                }

                // Insert VP transaction
                const { error: vpError } = await supabase.from('velocity_points' as any).insert({
                    user_id: user.id,
                    amount: amount, // Record original amount, not multiplied
                    reason,
                    question_id: questionId,
                    metadata,
                });

                if (vpError) throw vpError;

                // Update user's total VP and check for level up
                const newTotalVp = Math.max(0, data.totalVp + finalAmount);
                const newLevel = calculateLevel(newTotalVp);
                const leveledUp = newLevel.id > data.currentLevel.id;

                const { error: updateError } = await supabase
                    .from('user_levels' as any)
                    .update({
                        total_vp: newTotalVp,
                        current_level: newLevel.id,
                        last_level_up_at: leveledUp ? new Date().toISOString() : undefined,
                    })
                    .eq('user_id', user.id);

                if (updateError) throw updateError;

                // Unlock badge if leveled up
                if (leveledUp) {
                    await supabase
                        .from('badge_achievements' as any)
                        .insert({
                            user_id: user.id,
                            level_id: newLevel.id,
                        })
                        .then(({ error }) => {
                            if (error && error.code !== '23505') {
                                console.error('Error unlocking badge:', error);
                            }
                        });

                    setLevelUpData(newLevel);
                    setShowLevelUpAnimation(true);

                    toast.success(`Level Up! You've reached ${newLevel.name}!`, {
                        description: newLevel.description,
                        duration: 5000,
                    });
                }

                // Refresh data
                await fetchPoints();

                return true;
            } catch (error) {
                console.error('Error awarding points:', error);
                toast.error('Failed to award points');
                return false;
            }
        },
        [user, data.totalVp, data.currentLevel, data.streakMultiplier, fetchPoints]
    );

    /**
     * Check and update login streak on mount
     */
    useEffect(() => {
        if (!user) return;

        const checkLoginStreak = async () => {
            const result = await updateLoginStreak(user.id);
            if (result.vpAwarded > 0) {
                toast.success(`Daily login streak! +${result.vpAwarded} VP`, {
                    description: `${result.streakCount} day streak`,
                    duration: 3000,
                });
                fetchPoints();
            }
        };

        checkLoginStreak();
    }, [user, fetchPoints]);

    /**
     * Subscribe to real-time updates
     */
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('points-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_levels' as any,
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchPoints();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_streaks' as any,
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchPoints();
                }
            )
            .subscribe();

        // Listen for custom event for instant updates (bypassing Realtime latency)
        const handleCustomUpdate = () => {
            fetchPoints();
        };
        window.addEventListener('points-updated', handleCustomUpdate);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('points-updated', handleCustomUpdate);
        };
    }, [user, fetchPoints]);

    /**
     * Initial fetch
     */
    useEffect(() => {
        fetchPoints();
    }, [fetchPoints]);

    const closeLevelUpAnimation = useCallback(() => {
        setShowLevelUpAnimation(false);
        setLevelUpData(null);
    }, []);

    return {
        ...data,
        awardPoints,
        refetch: fetchPoints,
        showLevelUpAnimation,
        levelUpData,
        closeLevelUpAnimation,
    };
}
