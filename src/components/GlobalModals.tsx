"use client";

import { usePoints } from '@/hooks/usePoints';
import StreakCelebrationModal from '@/components/progression/StreakCelebrationModal';
import LevelUpAnimation from '@/components/progression/LevelUpAnimation';

/**
 * GlobalModals Component
 * Manages global modals like streak celebrations and level-ups
 * Should be placed in the Providers component
 */
export function GlobalModals() {
    const {
        showStreakModal,
        streakModalData,
        closeStreakModal,
        showLevelUpAnimation,
        levelUpData,
        closeLevelUpAnimation,
    } = usePoints();

    return (
        <>
            {/* Streak Celebration Modal */}
            {streakModalData && (
                <StreakCelebrationModal
                    open={showStreakModal}
                    onClose={closeStreakModal}
                    streakType={streakModalData.streakType}
                    streakCount={streakModalData.streakCount}
                    vpAwarded={streakModalData.vpAwarded}
                    multiplier={streakModalData.multiplier}
                    basePoints={streakModalData.basePoints}
                    bonusPoints={streakModalData.bonusPoints}
                    nextMilestone={streakModalData.nextMilestone}
                />
            )}

            {/* Level Up Animation Modal */}
            {levelUpData && (
                <LevelUpAnimation
                    level={levelUpData}
                    open={showLevelUpAnimation}
                    onClose={closeLevelUpAnimation}
                />
            )}
        </>
    );
}
