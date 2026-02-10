"use client";

// ============================================
// useVelocityPoints Hook
// Manages VP data fetching, real-time updates, and dynamic level progression
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type LevelDefinition, type UserLevel } from '@/config/levels';
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

// Default fallback level if DB is empty
const DEFAULT_LEVEL: LevelDefinition = {
    id: 1,
    name: 'Rookie',
    description: 'Welcome to the start.',
    vpThreshold: 0,
    track: 'WARM_UP',
    trackColor: '#3b82f6',
    badgeImageUrl: '',
    color: '#3b82f6'
};

export function useVelocityPoints() {
    const { user } = useAuth();
    const [levelsData, setLevelsData] = useState<LevelDefinition[]>([]);
    const [levelsLoading, setLevelsLoading] = useState(true);

    const [data, setData] = useState<VelocityPointsData>({
        totalVp: 0,
        currentLevel: DEFAULT_LEVEL,
        userLevel: null,
        loading: true,
        error: null,
    });

    const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
    const [levelUpData, setLevelUpData] = useState<LevelDefinition | null>(null);

    // Fetch Level Definitions from DB
    useEffect(() => {
        const fetchLevelDefinitions = async () => {
            try {
                const { data, error } = await supabase
                    .from('levels')
                    .select('*')
                    .order('rank', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    const mappedLevels: LevelDefinition[] = data.map(l => ({
                        id: l.rank || 0, // treating rank as ID for compatibility
                        name: l.name,
                        description: l.description || '',
                        vpThreshold: l.min_points,
                        track: 'CUSTOM' as any, // Using 'CUSTOM' or casting to any since Track is a union type
                        trackColor: l.color || '#3b82f6',
                        badgeImageUrl: l.icon_url || '',
                        color: l.color || '#3b82f6'
                    }));
                    setLevelsData(mappedLevels);
                }
            } catch (err) {
                console.error("Failed to fetch level definitions:", err);
            } finally {
                setLevelsLoading(false);
            }
        };
        fetchLevelDefinitions();
    }, []);

    const getLevelByRank = useCallback((rank: number) => {
        return levelsData.find(l => l.id === rank) || levelsData[0] || DEFAULT_LEVEL;
    }, [levelsData]);

    const calculateCurrentLevel = useCallback((vp: number) => {
        if (!levelsData.length) return DEFAULT_LEVEL;
        // Iterate reverse to find highest threshold met
        for (let i = levelsData.length - 1; i >= 0; i--) {
            if (vp >= levelsData[i].vpThreshold) {
                return levelsData[i];
            }
        }
        return levelsData[0];
    }, [levelsData]);

    /**
     * Fetch user's current VP and level data
     */
    const fetchVelocityPoints = useCallback(async () => {
        if (!user || levelsLoading) {
            if (!user) setData(prev => ({ ...prev, loading: false }));
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
                    // Start at rank 1 or min rank
                    const startLevel = levelsData[0] || DEFAULT_LEVEL;
                    const { data: newUserLevel, error: insertError } = await supabase
                        .from('user_levels' as any)
                        .insert({
                            user_id: user.id,
                            current_level: startLevel.id,
                            total_vp: 0,
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    setData({
                        totalVp: 0,
                        currentLevel: startLevel,
                        userLevel: newUserLevel as any,
                        loading: false,
                        error: null,
                    });
                    return;
                }
                throw error;
            }

            // Sync: Check if user's stored level rank matches their points
            // This self-healing ensures if ranges changed, user is updated on fetch
            const currentTotalVP = (userLevelData as any).total_vp;
            const correctLevel = calculateCurrentLevel(currentTotalVP);
            const storedRank = (userLevelData as any).current_level;

            let finalLevel = getLevelByRank(storedRank);

            // If stored rank is incorrect based on new rules, update it?
            // Optional: Auto-fix logic can reside here or in awardVP
            if (correctLevel.id !== storedRank) {
                // We could auto-update here but let's trust awardVP for major changes, 
                // but display the correct one.
                finalLevel = correctLevel;
            }

            setData({
                totalVp: currentTotalVP,
                currentLevel: finalLevel,
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
    }, [user, levelsLoading, levelsData, getLevelByRank, calculateCurrentLevel]);

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

            // Calculate new level dynamically
            const newLevel = calculateCurrentLevel(newTotalVp);
            const leveledUp = newLevel.id > data.currentLevel.id;

            const { error: updateError } = await supabase
                .from('user_levels' as any)
                .update({
                    total_vp: newTotalVp,
                    current_level: newLevel.id, // Store rank
                    last_level_up_at: leveledUp ? new Date().toISOString() : undefined,
                })
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            // 3. If leveled up, unlock new badge
            if (leveledUp) {
                // We use level.id (rank) as the ID for badge achievements too, 
                // assuming badge system supports it.
                // NOTE: If badge_achievements uses UUID FK to levels table, this might fail if we pass rank.
                // However, previous system seemed to use integer IDs.

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
    }, [user, data.totalVp, data.currentLevel, fetchVelocityPoints, calculateCurrentLevel]);

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
     * Initial fetch when levels are loaded
     */
    useEffect(() => {
        if (!levelsLoading) {
            fetchVelocityPoints();
        }
    }, [fetchVelocityPoints, levelsLoading]);

    return {
        ...data,
        awardVP,
        refetch: fetchVelocityPoints,
        showLevelUpAnimation,
        levelUpData,
        closeLevelUpAnimation,
    };
}
