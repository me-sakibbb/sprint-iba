// ============================================
// Practice Session Points Service
// Handles point awarding for practice sessions
// ============================================

import { supabase } from '@/integrations/supabase/client';
import {
    calculateAnswerPoints,
    calculateSessionBonus,
    calculateSpeedBonus,
} from '@/utils/pointCalculations';
import { calculateLevel } from '@/config/levels';
import { updatePracticeStreak } from '@/services/streakService';
import { checkIsCorrect } from '@/utils/answerValidation';

export interface PracticeAnswerResult {
    vpAwarded: number;
    isCorrect: boolean;
    speedBonus?: number;
}

export interface SessionCompletionResult {
    totalVP: number;
    sessionBonus: number;
    perfectBonus: number;
    highScoreBonus: number;
    streakBonus: number;
    streakCount: number;
}

/**
 * Award points for a single answer in practice session
 */
export async function awardPracticeAnswerPoints(
    userId: string,
    questionId: string,
    userAnswer: string,
    correctAnswer: string,
    options: string[] | null,
    difficulty: 'easy' | 'medium' | 'hard' | null,
    timeTaken?: number,
    timePerQuestion?: number
): Promise<PracticeAnswerResult> {
    try {
        const isCorrect = checkIsCorrect(correctAnswer, userAnswer, options);

        // Calculate speed bonus if timed mode
        let speedBonus = 0;
        if (timeTaken !== undefined && timePerQuestion) {
            const timeRemaining = timePerQuestion - timeTaken;
            speedBonus = await calculateSpeedBonus(timeRemaining, timePerQuestion);
        }

        // Calculate answer points
        const answerVP = await calculateAnswerPoints(difficulty, isCorrect, speedBonus);

        // Record VP transaction
        await supabase.from('velocity_points' as any).insert({
            user_id: userId,
            amount: answerVP,
            reason: isCorrect ? 'correct_answer' : 'wrong_answer',
            question_id: questionId,
            metadata: {
                difficulty,
                time_taken: timeTaken,
                speed_bonus: speedBonus,
            },
        });

        // Update user's total VP and Level
        const { data: currentLevelData } = await supabase
            .from('user_levels' as any)
            .select('total_vp, current_level')
            .eq('user_id', userId)
            .single();

        const currentVP = (currentLevelData as any)?.total_vp || 0;
        const oldLevelId = (currentLevelData as any)?.current_level || 1;
        const newTotalVP = Math.max(0, currentVP + answerVP);

        // Calculate new level
        const newLevel = calculateLevel(newTotalVP);
        const leveledUp = newLevel.id > oldLevelId;

        await supabase.from('user_levels' as any).upsert({
            user_id: userId,
            total_vp: newTotalVP,
            current_level: newLevel.id,
            last_level_up_at: leveledUp ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // Dispatch event for instant UI update
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('points-updated'));
        }

        return {
            vpAwarded: answerVP,
            isCorrect,
            speedBonus,
        };
    } catch (error) {
        console.error('Error awarding practice answer points:', error);
        return {
            vpAwarded: 0,
            isCorrect: userAnswer === correctAnswer,
            speedBonus: 0,
        };
    }
}

/**
 * Award bonuses for completing a practice session
 */
export async function awardSessionCompletionBonus(
    userId: string,
    sessionId: string,
    correctCount: number,
    totalQuestions: number
): Promise<SessionCompletionResult> {
    try {
        // Calculate session bonuses
        const { sessionBonus, perfectBonus, highScoreBonus } = await calculateSessionBonus(
            correctCount,
            totalQuestions
        );

        let totalBonusVP = sessionBonus;
        const bonusMetadata: any = {
            session_id: sessionId,
            correct_count: correctCount,
            total_questions: totalQuestions,
            score_percentage: (correctCount / totalQuestions) * 100,
        };

        // Award session completion bonus
        await supabase.from('velocity_points' as any).insert({
            user_id: userId,
            amount: sessionBonus,
            reason: 'session_complete',
            metadata: bonusMetadata,
        });

        // Award perfect score bonus if applicable
        if (perfectBonus > 0) {
            await supabase.from('velocity_points' as any).insert({
                user_id: userId,
                amount: perfectBonus,
                reason: 'perfect_score',
                metadata: bonusMetadata,
            });
            totalBonusVP += perfectBonus;
        }

        // Award high score bonus if applicable
        if (highScoreBonus > 0) {
            await supabase.from('velocity_points' as any).insert({
                user_id: userId,
                amount: highScoreBonus,
                reason: 'high_score',
                metadata: bonusMetadata,
            });
            totalBonusVP += highScoreBonus;
        }

        // Update practice streak and get streak bonus
        const streakResult = await updatePracticeStreak(userId, totalQuestions);

        // Update user's total VP and Level
        const { data: currentLevelData } = await supabase
            .from('user_levels' as any)
            .select('total_vp, current_level')
            .eq('user_id', userId)
            .single();

        const currentVP = (currentLevelData as any)?.total_vp || 0;
        const oldLevelId = (currentLevelData as any)?.current_level || 1;
        const newTotalVP = currentVP + totalBonusVP;

        // Calculate new level
        const newLevel = calculateLevel(newTotalVP);
        const leveledUp = newLevel.id > oldLevelId;

        await supabase.from('user_levels' as any).upsert({
            user_id: userId,
            total_vp: newTotalVP,
            current_level: newLevel.id,
            last_level_up_at: leveledUp ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // Dispatch event for instant UI update
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('points-updated'));
        }

        return {
            totalVP: totalBonusVP + streakResult.vpAwarded,
            sessionBonus,
            perfectBonus,
            highScoreBonus,
            streakBonus: streakResult.vpAwarded,
            streakCount: streakResult.streakCount,
        };
    } catch (error) {
        console.error('Error awarding session completion bonus:', error);
        return {
            totalVP: 0,
            sessionBonus: 0,
            perfectBonus: 0,
            highScoreBonus: 0,
            streakBonus: 0,
            streakCount: 0,
        };
    }
}
