// ============================================
// Example Integration Code
// Shows how to use the point system in practice/exam flows
// ============================================

/*
=====================================================
PRACTICE SESSION INTEGRATION EXAMPLE
=====================================================

In your practice session handler (e.g., page.tsx or component):

import { awardPracticeAnswerPoints, awardSessionCompletionBonus } from '@/services/practicePointsService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function PracticePage() {
    const { user } = useAuth();
    
    // When user answers a question
    const handleAnswer = async (answer: string, question: any, timeTaken?: number) => {
        if (!user) return;
        
        // Award points for the answer
        const result = await awardPracticeAnswerPoints(
            user.id,
            question.id,
            answer,
            question.correct_answer,
            question.difficulty,
            timeTaken,
            timePerQuestion // if timed mode
        );
        
        // Show toast notification
        if (result.isCorrect) {
            let message = `+${result.vpAwarded} VP`;
            if (result.speedBonus && result.speedBonus > 0) {
                message += ` (+${result.speedBonus} speed bonus)`;
            }
            toast.success('Correct! ' + message);
        } else {
            toast.error(`Wrong answer. ${result.vpAwarded} VP`);
        }
        
        // Save to practice_answers table as usual
        // ... your existing code
    };
    
    // When session completes
    const handleSessionComplete = async (sessionId: string, correctCount: number, totalQuestions: number) => {
        if (!user) return;
        
        // Award session bonuses
        const result = await awardSessionCompletionBonus(
            user.id,
            sessionId,
            correctCount,
            totalQuestions
        );
        
        // Show completion message
        let bonusMessage = `Session Complete! +${result.sessionBonus} VP`;
        
        if (result.perfectBonus > 0) {
            bonusMessage += `\n🎉 Perfect Score! +${result.perfectBonus} VP`;
        } else if (result.highScoreBonus > 0) {
            bonusMessage += `\n⭐ High Score! +${result.highScoreBonus} VP`;
        }
        
        if (result.streakBonus > 0) {
            bonusMessage += `\n🔥 ${result.streakCount} Day Streak! +${result.streakBonus} VP`;
        }
        
        toast.success(bonusMessage, { duration: 5000 });
    };
}

=====================================================
EXAM COMPLETION INTEGRATION EXAMPLE
=====================================================

Exams should be submitted via the secure RPC function 'submit_exam_attempt'.
This handles scoring, updates, and point awarding on the server side.

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function ExamResultsPage() {
    const { user } = useAuth();
    
    const handleExamSubmit = async (attemptId: string, answers: Record<string, string>) => {
        if (!user) return;
        
        // Secure submission via RPC
        const { data: result, error } = await supabase.rpc('submit_exam_attempt', {
            p_attempt_id: attemptId,
            p_answers: answers
        });
        
        if (error) {
            toast.error(error.message);
            return;
        }
        
        // Show result message
        let message = `Exam Complete! +${result.points_awarded} VP`;
        
        if (result.leveled_up) {
            message += `\n🎉 Level Up! You are now Level ${result.new_level}!`;
        }
        
        toast.success(message, { duration: 5000 });
    };
}

=====================================================
MANUAL VP ADJUSTMENT (ADMIN ONLY)
=====================================================

For admin manual adjustments:

import { usePoints } from '@/hooks/usePoints';

function AdminPanel() {
    const { awardPoints } = usePoints();
    
    const handleManualAdjustment = async (userId: string, amount: number, reason: string) => {
        await awardPoints({
            amount,
            reason: 'manual_adjustment',
            metadata: {
                adjusted_by: adminId,
                reason,
                timestamp: new Date().toISOString()
            }
        });
    };
}

=====================================================
DISPLAYING POINTS IN UI
=====================================================

Use the usePoints hook anywhere:

import { usePoints } from '@/hooks/usePoints';

function MyComponent() {
    const {
        totalVp,
        currentLevel,
        loginStreak,
        practiceStreak,
        streakMultiplier,
        loading
    } = usePoints();
    
    return (
        <div>
            <p>VP: {totalVp}</p>
            <p>Level: {currentLevel.name}</p>
            <p>Login Streak: {loginStreak} days</p>
            <p>Multiplier: {streakMultiplier}x</p>
        </div>
    );
}

*/
