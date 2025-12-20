// ============================================
// LevelUpAnimation Component
// Full-screen celebration when user levels up
// ============================================

import { useEffect, useState } from 'react';
import { type LevelDefinition, TRACK_THEMES } from '@/config/levels';
import LevelBadge from '../badges/LevelBadge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Trophy, Zap } from 'lucide-react';

interface LevelUpAnimationProps {
    level: LevelDefinition;
    open: boolean;
    onClose: () => void;
}

export default function LevelUpAnimation({ level, open, onClose }: LevelUpAnimationProps) {
    const [showConfetti, setShowConfetti] = useState(false);
    const trackTheme = TRACK_THEMES[level.track];

    useEffect(() => {
        if (open) {
            setShowConfetti(true);
            // Play whoosh sound (if available)
            const audio = new Audio('/sounds/whoosh.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
                // Ignore if sound fails to play
            });

            // Auto-close after 5 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 5000);

            return () => clearTimeout(timer);
        } else {
            setShowConfetti(false);
        }
    }, [open, onClose]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl border-none bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl">
                <div className="relative py-8">
                    {/* Confetti Effect */}
                    {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(30)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full animate-confetti"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: '-10%',
                                        background: [trackTheme.primary, trackTheme.secondary, trackTheme.accent][
                                            Math.floor(Math.random() * 3)
                                        ],
                                        animationDelay: `${Math.random() * 0.5}s`,
                                        animationDuration: `${2 + Math.random() * 2}s`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="relative z-10 space-y-6 text-center animate-in fade-in zoom-in duration-500">
                        {/* Trophy Icon */}
                        <div className="flex justify-center">
                            <div
                                className="p-6 rounded-full animate-pulse"
                                style={{
                                    background: trackTheme.gradient,
                                    boxShadow: `0 0 50px ${trackTheme.primary}60`,
                                }}
                            >
                                <Trophy className="w-16 h-16 text-white" />
                            </div>
                        </div>

                        {/* Level Up Text */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-accent">
                                <Sparkles className="w-5 h-5 animate-spin" />
                                <h2 className="text-2xl font-bold uppercase tracking-wide">Level Up!</h2>
                                <Sparkles className="w-5 h-5 animate-spin" />
                            </div>
                            <h3
                                className="text-4xl font-black animate-in slide-in-from-left duration-700"
                                style={{ color: trackTheme.primary }}
                            >
                                {level.name}
                            </h3>
                        </div>

                        {/* Badge Reveal */}
                        <div className="flex justify-center animate-in zoom-in duration-1000 delay-300">
                            <LevelBadge level={level} size="xl" showName={false} />
                        </div>

                        {/* Description */}
                        <p className="text-lg text-muted-foreground max-w-md mx-auto animate-in fade-in slide-in-from-bottom duration-700 delay-500">
                            {level.description}
                        </p>

                        {/* Track Name */}
                        <div
                            className="inline-block px-6 py-2 rounded-full font-semibold text-white animate-in fade-in duration-700 delay-700"
                            style={{
                                background: trackTheme.gradient,
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                {TRACK_THEMES[level.track].name}
                            </span>
                        </div>

                        {/* Finish Line Animation */}
                        <div className="relative h-1 w-full max-w-md mx-auto overflow-hidden rounded-full bg-muted">
                            <div
                                className="absolute inset-y-0 left-0 right-0 animate-finish-line"
                                style={{ background: trackTheme.gradient }}
                            />
                        </div>

                        {/* Close Button */}
                        <div className="pt-4 animate-in fade-in duration-700 delay-1000">
                            <Button
                                onClick={onClose}
                                className="gradient-primary"
                                style={{
                                    background: trackTheme.gradient,
                                }}
                            >
                                Continue Sprinting 🚀
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
