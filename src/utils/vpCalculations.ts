// ============================================
// VP Calculation Utilities
// ============================================

/**
 * VP award amounts for different actions
 */
export const VP_REWARDS = {
    CORRECT_ANSWER: 100,
    MODULE_COMPLETE: 1000,
    DAILY_STREAK: 500,
    BONUS: 0, // Variable bonus amount
} as const;

/**
 * Calculate VP for a correct answer
 */
export function calculateCorrectAnswerVP(): number {
    return VP_REWARDS.CORRECT_ANSWER;
}

/**
 * Calculate VP for module completion
 */
export function calculateModuleCompleteVP(): number {
    return VP_REWARDS.MODULE_COMPLETE;
}

/**
 * Calculate VP for daily streak
 */
export function calculateDailyStreakVP(streakDays: number = 1): number {
    return VP_REWARDS.DAILY_STREAK * streakDays;
}

/**
 * Calculate VP for a bonus reward
 */
export function calculateBonusVP(amount: number): number {
    return amount;
}

/**
 * Format large VP numbers with abbreviations (K, M)
 */
export function formatVPShort(vp: number): string {
    if (vp >= 1000000) {
        return `${(vp / 1000000).toFixed(1)}M`;
    }
    if (vp >= 1000) {
        return `${(vp / 1000).toFixed(1)}K`;
    }
    return vp.toString();
}

/**
 * Format VP with full number and commas
 */
export function formatVPFull(vp: number): string {
    return vp.toLocaleString('en-US');
}

/**
 * Calculate percentage progress between two VP values
 */
export function calculateProgressPercentage(
    currentVp: number,
    startVp: number,
    targetVp: number
): number {
    if (targetVp <= startVp) return 100;

    const progress = currentVp - startVp;
    const total = targetVp - startVp;

    return Math.min(100, Math.max(0, (progress / total) * 100));
}

/**
 * Get a motivational message based on VP progress
 */
export function getMotivationalMessage(progressPercentage: number): string {
    if (progressPercentage === 100) {
        return "Level up! You're unstoppable!";
    }
    if (progressPercentage >= 90) {
        return "Almost there! One final push!";
    }
    if (progressPercentage >= 75) {
        return "You're in the home stretch!";
    }
    if (progressPercentage >= 50) {
        return "Halfway there! Keep the momentum!";
    }
    if (progressPercentage >= 25) {
        return "Great progress! Stay focused!";
    }
    return "Every sprint starts with a single step!";
}
