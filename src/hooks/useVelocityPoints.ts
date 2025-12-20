// ============================================
// useVelocityPoints Hook
// Manages VP data fetching, real-time updates, and level progression
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateLevel, getLevelById, type LevelDefinition, type UserLevel } from '@/config/levels';
import { toast } from 'sonner';

interface VelocityPointsData {
    totalVp: number;
    currentLevel: LevelDefinition;
    userLevel: UserLevel | null;
    loading: boolean;
    error: Error | null;
}

interface AwardVPParams {
    amount: number;
    reason: 'correct_answer' | 'module_complete' | 'daily_streak' | 'bonus' | 'manual_adjustment';
    questionId?: string;
    metadata?: Record<string, any>;
}

export function useVelocityPoints() {
    const { user } = useAuth();
    const [data, setData] = useState<VelocityPointsData>({
        totalVp: 0,
        currentLevel: getLevelById(1)!,
        userLevel: null,
        loading: true,
        error: null,
    });

    const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
    const [levelUpData, setLevelUpData] = useState<LevelDefinition | null>(null);

    /**
     * Fetch user's current VP and level data
     */
    const fetchVelocityPoints = useCallback(async () => {
        if (!user) {
            setData(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            // Fetch user level data
            const { data: userLevelData, error } = await supabase
                .from('user_levels' as any)
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // If user doesn't have a level record yet, create one
                if (error.code === 'PGRST116') {
                    const { data: newUserLevel, error: insertError } = await supabase
                        .from('user_levels' as any)
                        .insert({
                            user_id: user.id,
                            current_level: 1,
                            total_vp: 0,
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    setData({
                        totalVp: 0,
                        currentLevel: getLevelById(1)!,
                        userLevel: newUserLevel as any,
                        loading: false,
                        error: null,
                    });
                    return;
                }
                throw error;
            }

            const currentLevel = getLevelById((userLevelData as any).current_level) || getLevelById(1)!;

            setData({
                totalVp: (userLevelData as any).total_vp,
                currentLevel,
                userLevel: userLevelData as any,
                loading: false,
                error: null,
            });
        } catch (error) {
            console.error('Error fetching velocity points:', error);
            setData(prev => ({
                ...prev,
                loading: false,
                error: error as Error,
            }));
        }
    }, [user]);

    /**
     * Award VP to the user
     */
    const awardVP = useCallback(async ({
        amount,
        reason,
        questionId,
        metadata,
    }: AwardVPParams): Promise<boolean> => {
        if (!user) return false;

        try {
            // 1. Insert VP transaction
            const { error: vpError } = await supabase
                .from('velocity_points' as any)
                .insert({
                    user_id: user.id,
                    amount,
                    reason,
                    question_id: questionId,
                    metadata,
                });

            if (vpError) throw vpError;

            // 2. Update user's total VP
            const newTotalVp = data.totalVp + amount;
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

            // 3. If leveled up, unlock new badge
            if (leveledUp) {
                const { error: badgeError } = await supabase
                    .from('badge_achievements' as any)
                    .insert({
                        user_id: user.id,
                        level_id: newLevel.id,
                    });

                // Ignore conflict errors (badge already unlocked)
                if (badgeError && badgeError.code !== '23505') {
                    console.error('Error unlocking badge:', badgeError);
                }

                // Trigger level-up animation
                setLevelUpData(newLevel);
                setShowLevelUpAnimation(true);

                toast.success(`Level Up! You've reached ${newLevel.name}!`, {
                    description: newLevel.description,
                    duration: 5000,
                });
            }

            // 4. Update local state
            await fetchVelocityPoints();

            return true;
        } catch (error) {
            console.error('Error awarding VP:', error);
            toast.error('Failed to award Velocity Points');
            return false;
        }
    }, [user, data.totalVp, data.currentLevel, fetchVelocityPoints]);

    /**
     * Close level-up animation
     */
    const closeLevelUpAnimation = useCallback(() => {
        setShowLevelUpAnimation(false);
        setLevelUpData(null);
    }, []);

    /**
     * Subscribe to real-time VP updates
     */
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('velocity-points-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_levels',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchVelocityPoints();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchVelocityPoints]);

    /**
     * Initial fetch
     */
    useEffect(() => {
        fetchVelocityPoints();
    }, [fetchVelocityPoints]);

    return {
        ...data,
        awardVP,
        refetch: fetchVelocityPoints,
        showLevelUpAnimation,
        levelUpData,
        closeLevelUpAnimation,
    };
}
