# Points System Integration Examples

This document provides examples of how to integrate the points system into various parts of the application.

## Practice Session Integration

In your practice session handler (e.g., page.tsx or component):

```typescript
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
```

## Exam Completion Integration

In your exam results handler:

```typescript
import { awardExamCompletionBonus, calculateExamPercentile } from '@/services/examPointsService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function ExamResultsPage() {
    const { user } = useAuth();
    
    const handleExamSubmit = async (examId: string, score: number, totalQuestions: number) => {
        if (!user) return;
        
        // Calculate user's percentile rank
        const percentile = await calculateExamPercentile(examId, score);
        
        // Award exam bonuses
        const result = await awardExamCompletionBonus(
            user.id,
            examId,
            score,
            totalQuestions,
            percentile
        );
        
        // Show result message
        let message = `Exam Complete! +${result.completionBonus} VP`;
        
        if (result.scoreBonus > 0) {
            if ((score / totalQuestions) * 100 === 100) {
                message += `\n🏆 Perfect Score! +${result.scoreBonus} VP`;
            } else if (percentile && percentile <= 10) {
                message += `\n🌟 Top 10%! +${result.scoreBonus} VP`;
            }
        }
        
        toast.success(message, { duration: 5000 });
    };
}
```

## Manual VP Adjustment (Admin Only)

For admin manual adjustments:

```typescript
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
```

## Displaying Points in UI

Use the `usePoints` hook anywhere:

```typescript
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
```
