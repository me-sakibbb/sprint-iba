// ============================================
// StreakCelebrationModal Component
// Gamified celebration modal for streak achievements
// ============================================

"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flame, BookOpen, Sparkles, Zap, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// VisuallyHidden component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
    <span className="sr-only">{children}</span>
);

interface StreakCelebrationModalProps {
    open: boolean;
    onClose: () => void;
    streakType: 'login' | 'practice';
    streakCount: number;
    vpAwarded: number;
    multiplier: number;
    basePoints: number;
    bonusPoints: number;
    nextMilestone: number | null;
}

export default function StreakCelebrationModal({
    open,
    onClose,
    streakType,
    streakCount,
    vpAwarded,
    multiplier,
    basePoints,
    bonusPoints,
    nextMilestone,
}: StreakCelebrationModalProps) {
    const [showConfetti, setShowConfetti] = useState(false);

    // Theme colors based on streak type
    const theme = streakType === 'login'
        ? {
            primary: '#f97316', // orange-500
            light: '#fed7aa', // orange-200
            bg: '#fff7ed', // orange-50
            name: 'Daily Login',
            Icon: Flame,
        }
        : {
            primary: '#a855f7', // purple-500
            light: '#e9d5ff', // purple-200
            bg: '#faf5ff', // purple-50
            name: 'Practice',
            Icon: BookOpen,
        };

    // Fire icon count based on streak milestones
    const getFireIconCount = (count: number) => {
        if (count >= 30) return 4;
        if (count >= 14) return 3;
        if (count >= 7) return 2;
        return 1;
    };

    // Multiplier badge text
    const getMultiplierBadge = (mult: number) => {
        if (mult >= 2.5) return '2.5x LEGENDARY!';
        if (mult >= 2.0) return '2x EPIC BOOST!';
        if (mult >= 1.5) return '1.5x BOOST!';
        return null;
    };

    useEffect(() => {
        if (open) {
            setShowConfetti(true);

            // Play celebration sound (optional)
            try {
                const audio = new Audio('/sounds/achievement.mp3');
                audio.volume = 0.4;
                audio.play().catch(() => {
                    // Ignore if sound fails
                });
            } catch (e) {
                // Ignore if audio fails
            }
        } else {
            setShowConfetti(false);
        }
    }, [open]);

    const multiplierBadge = getMultiplierBadge(multiplier);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-xl border-2 bg-background overflow-hidden p-0"
                style={{
                    borderColor: theme.primary,
                }}
            >
                <DialogTitle asChild>
                    <VisuallyHidden>
                        {theme.name} Streak Celebration
                    </VisuallyHidden>
                </DialogTitle>

                {/* Header with colored background */}
                <div
                    className="relative px-8 py-12 overflow-hidden"
                    style={{ backgroundColor: theme.bg }}
                >
                    {/* Confetti Effect */}
                    {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(40)].map((_, i) => {
                                const colors = [theme.primary, theme.light, '#fbbf24'];
                                return (
                                    <div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full animate-confetti"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            top: '-10%',
                                            background: colors[Math.floor(Math.random() * colors.length)],
                                            animationDelay: `${Math.random() * 0.5}s`,
                                            animationDuration: `${2 + Math.random() * 2}s`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Icon */}
                    <div className="relative z-10 flex justify-center mb-6">
                        <div
                            className="p-6 rounded-full animate-pulse"
                            style={{
                                backgroundColor: theme.primary,
                                boxShadow: `0 10px 40px ${theme.primary}40`,
                            }}
                        >
                            <theme.Icon className="w-16 h-16 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="relative z-10 text-center space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500 animate-spin" />
                            <h2
                                className="text-2xl font-bold uppercase tracking-wide"
                                style={{ color: theme.primary }}
                            >
                                {theme.name} Streak!
                            </h2>
                            <Sparkles className="w-5 h-5 text-yellow-500 animate-spin" />
                        </div>

                        {/* Streak Count with Fire Icons */}
                        <div className="flex items-center justify-center gap-3">
                            {[...Array(getFireIconCount(streakCount))].map((_, i) => (
                                <Flame
                                    key={i}
                                    className="w-10 h-10"
                                    style={{ color: theme.primary }}
                                />
                            ))}
                            <span className="text-5xl font-black">{streakCount}</span>
                        </div>
                        <p className="text-lg font-semibold text-muted-foreground">
                            {streakCount === 1 ? 'Day' : 'Days'} in a row!
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 py-8 space-y-6">
                    {/* VP Earned */}
                    <div className="text-center space-y-3">
                        <div
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border-2"
                            style={{
                                borderColor: theme.primary,
                                backgroundColor: theme.bg,
                            }}
                        >
                            <Zap className="w-8 h-8" style={{ color: theme.primary }} />
                            <div className="text-left">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    You Earned
                                </p>
                                <p className="text-3xl font-black text-green-500">
                                    +{vpAwarded} VP
                                </p>
                            </div>
                        </div>

                        {/* Breakdown if multiplier applied */}
                        {bonusPoints > 0 && (
                            <div className="inline-block text-sm space-y-1 px-6 py-3 rounded-lg bg-muted/50">
                                <div className="flex gap-8 text-muted-foreground">
                                    <span>Base Points:</span>
                                    <span className="font-bold">+{basePoints} VP</span>
                                </div>
                                <div className="flex gap-8">
                                    <span className="text-yellow-600 font-semibold">Streak Bonus:</span>
                                    <span className="font-bold text-yellow-600">+{bonusPoints} VP</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Multiplier Badge */}
                    {multiplierBadge && (
                        <div className="flex justify-center">
                            <div
                                className="inline-block px-6 py-3 rounded-full font-black text-sm text-white shadow-lg animate-bounce"
                                style={{
                                    backgroundColor: '#fbbf24',
                                    boxShadow: '0 4px 20px #fbbf2460',
                                }}
                            >
                                {multiplierBadge}
                            </div>
                        </div>
                    )}

                    {/* Next Milestone */}
                    {nextMilestone && (
                        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-muted/50">
                            <Trophy className="w-5 h-5" style={{ color: theme.primary }} />
                            <p className="text-sm font-semibold">
                                <span className="text-muted-foreground">
                                    {nextMilestone - streakCount} more {nextMilestone - streakCount === 1 ? 'day' : 'days'} until
                                </span>{' '}
                                <span style={{ color: theme.primary }} className="font-black">
                                    {nextMilestone === 7 && '1.5x'}
                                    {nextMilestone === 14 && '2x'}
                                    {nextMilestone === 30 && '2.5x'}
                                </span>{' '}
                                <span className="text-muted-foreground">boost!</span>
                            </p>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="absolute inset-y-0 left-0 right-0 animate-finish-line rounded-full"
                            style={{ backgroundColor: theme.primary }}
                        />
                    </div>

                    {/* Continue Button */}
                    <div className="pt-2">
                        <Button
                            onClick={onClose}
                            size="lg"
                            className="w-full text-white font-bold shadow-lg hover:shadow-xl transition-all"
                            style={{
                                backgroundColor: theme.primary,
                            }}
                        >
                            Keep the Streak Going!
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
