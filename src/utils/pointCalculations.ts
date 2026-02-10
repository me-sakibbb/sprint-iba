// ============================================
// Point Calculation Utilities
// Core functions for calculating VP based on various actions
// ============================================

import { supabase } from '@/integrations/supabase/client';

export interface PointConfig {
    point_values_correct: { easy: number; medium: number; hard: number };
    point_values_wrong: { easy: number; medium: number; hard: number };
    session_completion_bonus: number;
    perfect_score_bonus: number;
    high_score_bonus: number;
    high_score_threshold: number;
    speed_bonus_max: number;
    exam_completion_bonus: number;
    exam_top_10_bonus: number;
    exam_perfect_bonus: number;
    login_streak_daily: number;
    practice_streak_daily: number;
    streak_multipliers: Record<string, number>;
    allow_negative_points: boolean;
    min_practice_questions: number;
}

// Cache for point configuration
let configCache: PointConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch point configuration from database with caching
 */
export async function getPointConfig(): Promise<PointConfig> {
    const now = Date.now();

    // Return cached config if still valid
    if (configCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return configCache;
    }

    try {
        const { data, error } = await supabase
            .from('point_configuration')
            .select('config_key, config_value');

        if (error) throw error;

        // Transform array to object
        const config: any = {};
        data?.forEach(item => {
            const value = item.config_value;
            // Parse numeric values from jsonb
            if (typeof value === 'number' || typeof value === 'boolean') {
                config[item.config_key] = value;
            } else if (typeof value === 'string') {
                config[item.config_key] = isNaN(Number(value)) ? value : Number(value);
            } else {
                config[item.config_key] = value;
            }
        });

        configCache = config as PointConfig;
        cacheTimestamp = now;

        return configCache;
    } catch (error) {
        console.error('Error fetching point config:', error);
        // Return default values if fetch fails
        return getDefaultConfig();
    }
}

/**
 * Get default point configuration
 */
export function getDefaultConfig(): PointConfig {
    return {
        point_values_correct: { easy: 50, medium: 100, hard: 200 },
        point_values_wrong: { easy: -15, medium: -25, hard: -40 },
        session_completion_bonus: 100,
        perfect_score_bonus: 500,
        high_score_bonus: 250,
        high_score_threshold: 80,
        speed_bonus_max: 50,
        exam_completion_bonus: 500,
        exam_top_10_bonus: 1000,
        exam_perfect_bonus: 2000,
        login_streak_daily: 50,
        practice_streak_daily: 100,
        streak_multipliers: { "7": 1.5, "14": 2.0, "30": 2.5 },
        allow_negative_points: false,
        min_practice_questions: 3,
    };
}

/**
 * Clear configuration cache (call when admin updates config)
 */
export function clearConfigCache() {
    configCache = null;
    cacheTimestamp = 0;
}

/**
 * Calculate VP for answering a question
 */
export async function calculateAnswerPoints(
    difficulty: 'easy' | 'medium' | 'hard' | null,
    isCorrect: boolean,
    timeBonus?: number
): Promise<number> {
    const config = await getPointConfig();
    const diff = difficulty || 'medium';

    let points = 0;

    if (isCorrect) {
        points = config.point_values_correct[diff];

        // Add time bonus if provided (for timed mode)
        if (timeBonus) {
            points += Math.min(timeBonus, config.speed_bonus_max);
        }
    } else {
        points = config.point_values_wrong[diff];
    }

    return points;
}

/**
 * Calculate session completion bonuses
 */
export async function calculateSessionBonus(
    correctCount: number,
    totalQuestions: number
): Promise<{ sessionBonus: number; perfectBonus: number; highScoreBonus: number }> {
    const config = await getPointConfig();

    const scorePercentage = (correctCount / totalQuestions) * 100;

    let sessionBonus = config.session_completion_bonus;
    let perfectBonus = 0;
    let highScoreBonus = 0;

    if (scorePercentage === 100) {
        perfectBonus = config.perfect_score_bonus;
    } else if (scorePercentage >= config.high_score_threshold) {
        highScoreBonus = config.high_score_bonus;
    }

    return { sessionBonus, perfectBonus, highScoreBonus };
}

/**
 * Calculate exam bonuses
 */
export async function calculateExamBonus(
    score: number,
    totalQuestions: number,
    userRankPercentile?: number
): Promise<{ completionBonus: number; scoreBonus: number }> {
    const config = await getPointConfig();

    const scorePercentage = (score / totalQuestions) * 100;

    let completionBonus = config.exam_completion_bonus;
    let scoreBonus = 0;

    if (scorePercentage === 100) {
        scoreBonus = config.exam_perfect_bonus;
    } else if (userRankPercentile !== undefined && userRankPercentile <= 10) {
        scoreBonus = config.exam_top_10_bonus;
    }

    return { completionBonus, scoreBonus };
}

/**
 * Calculate streak multiplier based on login and practice streaks
 */
export async function calculateStreakMultiplier(
    loginStreak: number,
    practiceStreak: number
): Promise<number> {
    const config = await getPointConfig();
    const maxStreak = Math.max(loginStreak, practiceStreak);

    // Find the highest applicable multiplier
    const thresholds = Object.keys(config.streak_multipliers)
        .map(Number)
        .sort((a, b) => b - a); // Sort descending

    for (const threshold of thresholds) {
        if (maxStreak >= threshold) {
            return config.streak_multipliers[threshold.toString()];
        }
    }

    return 1.0; // No multiplier
}

/**
 * Apply streak multiplier to points
 */
export function applyMultiplier(points: number, multiplier: number): number {
    return Math.round(points * multiplier);
}

/**
 * Ensure total VP doesn't go negative (unless explicitly allowed)
 */
export async function ensureNonNegative(
    currentVP: number,
    deltaVP: number
): Promise<number> {
    const config = await getPointConfig();

    if (config.allow_negative_points) {
        return deltaVP;
    }

    const newVP = currentVP + deltaVP;

    if (newVP < 0) {
        // Reduce penalty so VP stays at 0
        return -currentVP;
    }

    return deltaVP;
}

/**
 * Calculate speed bonus based on time remaining (for timed mode)
 * Returns bonus VP based on how quickly question was answered
 */
export async function calculateSpeedBonus(
    timeRemaining: number,
    totalTime: number
): Promise<number> {
    const config = await getPointConfig();

    if (timeRemaining <= 0 || totalTime <= 0) return 0;

    // Percentage of time remaining
    const timePercentage = (timeRemaining / totalTime) * 100;

    // Award more bonus for answering quickly
    // Linear scale: 100% time = max bonus, 0% time = 0 bonus
    const bonus = Math.round((timePercentage / 100) * config.speed_bonus_max);

    return bonus;
}

/**
 * Format VP number for display
 */
export function formatVP(vp: number): string {
    if (vp >= 1000000) {
        return `${(vp / 1000000).toFixed(1)}M`;
    } else if (vp >= 1000) {
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
