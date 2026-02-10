// ============================================
// Exam Points Service
// Handles point awarding for exam completion
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { calculateExamBonus } from '@/utils/pointCalculations';
import { calculateLevel } from '@/config/levels';

export interface ExamCompletionResult {
    totalVP: number;
    completionBonus: number;
    scoreBonus: number;
    percentile?: number;
}

/**
 * Award points for completing an exam
 */
export async function awardExamCompletionBonus(
    userId: string,
    examId: string,
    score: number,
    totalQuestions: number,
    userRankPercentile?: number
): Promise<ExamCompletionResult> {
    try {
        // Calculate exam bonuses
        const { completionBonus, scoreBonus } = await calculateExamBonus(
            score,
            totalQuestions,
            userRankPercentile
        );

        const totalVP = completionBonus + scoreBonus;

        const bonusMetadata = {
            exam_id: examId,
            score,
            total_questions: totalQuestions,
            score_percentage: (score / totalQuestions) * 100,
            percentile: userRankPercentile,
        };

        // Award completion bonus
        await supabase.from('velocity_points' as any).insert({
            user_id: userId,
            amount: completionBonus,
            reason: 'exam_complete',
            metadata: bonusMetadata,
        });

        // Award score bonus if applicable
        if (scoreBonus > 0) {
            const reason = (score / totalQuestions) * 100 === 100 ? 'perfect_score' : 'high_score';

            await supabase.from('velocity_points' as any).insert({
                user_id: userId,
                amount: scoreBonus,
                reason,
                metadata: bonusMetadata,
            });
        }

        // Update user's total VP and Level
        const { data: currentLevelData } = await supabase
            .from('user_levels' as any)
            .select('total_vp, current_level')
            .eq('user_id', userId)
            .single();

        const currentVP = (currentLevelData as any)?.total_vp || 0;
        const oldLevelId = (currentLevelData as any)?.current_level || 1;
        const newTotalVP = currentVP + totalVP;

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
            totalVP,
            completionBonus,
            scoreBonus,
            percentile: userRankPercentile,
        };
    } catch (error) {
        console.error('Error awarding exam completion bonus:', error);
        return {
            totalVP: 0,
            completionBonus: 0,
            scoreBonus: 0,
        };
    }
}

/**
 * Calculate user's percentile rank in an exam
 */
export async function calculateExamPercentile(
    examId: string,
    userScore: number
): Promise<number> {
    try {
        // Get all scores for this exam
        const { data: attempts, error } = await supabase
            .from('exam_attempts')
            .select('score')
            .eq('exam_id', examId)
            .eq('is_submitted', true);

        if (error || !attempts || attempts.length === 0) {
            return 100; // Default to 100th percentile if no data
        }

        // Count how many scores are lower than user's score
        const lowerScores = attempts.filter((a) => a.score < userScore).length;
        const percentile = (lowerScores / attempts.length) * 100;

        return 100 - percentile; // Convert to top percentile (lower is better)
    } catch (error) {
        console.error('Error calculating exam percentile:', error);
        return 100;
    }
}
