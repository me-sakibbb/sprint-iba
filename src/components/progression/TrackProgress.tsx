// ============================================
// TrackProgress Component
// Visualizes user progress as a running track with runner avatar
// ============================================

import { type LevelDefinition, TRACK_THEMES, getNextLevel, calculateProgressToNextLevel, getVpUntilNextLevel } from '@/config/levels';
import { formatVPFull, formatVPShort } from '@/utils/vpCalculations';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import LevelBadge from '../badges/LevelBadge';

interface TrackProgressProps {
    totalVp: number;
    currentLevel: LevelDefinition;
    className?: string;
}

export default function TrackProgress({ totalVp, currentLevel, className }: TrackProgressProps) {
    const nextLevel = getNextLevel(currentLevel.id);
    const progressPercentage = nextLevel
        ? calculateProgressToNextLevel(totalVp, currentLevel.id)
        : 100;
    const vpRemaining = nextLevel ? getVpUntilNextLevel(totalVp, currentLevel.id) : 0;
    const trackTheme = TRACK_THEMES[currentLevel.track] || {
        primary: currentLevel.color || '#3b82f6',
        secondary: currentLevel.color || '#3b82f6',
        accent: currentLevel.color || '#3b82f6',
        gradient: `linear-gradient(135deg, ${currentLevel.color || '#3b82f6'} 0%, ${currentLevel.color || '#3b82f6'} 100%)`,
        name: currentLevel.name
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    Your Sprint Progress
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Current VP Display */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/velocity-coin.png"
                            alt="Velocity Points"
                            className="w-12 h-12 object-contain animate-pulse"
                        />
                        <div>
                            <p className="text-sm text-muted-foreground">Current Velocity</p>
                            <p className="text-2xl font-bold gradient-text">{formatVPFull(totalVp)} VP</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current Rank</p>
                        <p className="text-xl font-bold" style={{ color: trackTheme.primary }}>
                            {currentLevel.name}
                        </p>
                    </div>
                </div>

                {/* Track Visualization */}
                <div className="relative">
                    {/* Track Lane */}
                    <div
                        className="relative h-24 rounded-lg overflow-hidden border-2"
                        style={{
                            borderColor: trackTheme.primary,
                            background: `linear-gradient(90deg, ${trackTheme.primary}20 0%, ${trackTheme.accent}20 100%)`,
                        }}
                    >
                        {/* Lane Lines */}
                        <div className="absolute inset-y-0 left-0 right-0 flex">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className="flex-1 border-r border-white/10"
                                />
                            ))}
                        </div>

                        {/* Runner Avatar (positioned based on progress) */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                            style={{ left: `${Math.max(2, Math.min(95, progressPercentage))}%` }}
                        >
                            <div className="relative">
                                {/* Current Level Badge as Runner */}
                                <LevelBadge level={currentLevel} size="md" />

                                {/* Motion lines behind runner */}
                                {progressPercentage > 10 && (
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 flex gap-1">
                                        {[...Array(3)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-4 h-0.5 bg-white/40 rounded"
                                                style={{ width: `${12 - i * 3}px` }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Finish Line (if next level exists) */}
                        {nextLevel && (
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white to-transparent animate-pulse" />
                        )}
                    </div>

                    {/* Track Labels */}
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{currentLevel.name}</span>
                        {nextLevel ? (
                            <span className="font-semibold">{nextLevel.name}</span>
                        ) : (
                            <span className="font-semibold text-accent">MAX LEVEL!</span>
                        )}
                    </div>
                </div>

                {/* Progress Bar (Alternative visualization) */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Progress to {nextLevel ? nextLevel.name : 'Max Level'}
                        </span>
                        <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress
                        value={progressPercentage}
                        className="h-3"
                        style={{
                            // @ts-ignore - Custom CSS variable
                            '--progress-bg': trackTheme.gradient,
                        }}
                    />
                    {nextLevel && (
                        <p className="text-xs text-muted-foreground text-right">
                            {formatVPShort(vpRemaining)} VP until next level
                        </p>
                    )}
                </div>

                {/* Next Milestone Info */}
                {nextLevel && (
                    <div
                        className="p-4 rounded-lg border"
                        style={{
                            background: `linear-gradient(135deg, ${trackTheme.secondary}10 0%, transparent 100%)`,
                            borderColor: trackTheme.secondary,
                        }}
                    >
                        <p className="text-sm font-semibold mb-1">Next Finish Line:</p>
                        <div className="flex items-center gap-2">
                            <LevelBadge level={nextLevel} size="sm" />
                            <div className="flex-1">
                                <p className="text-sm font-bold">{nextLevel.name}</p>
                                <p className="text-xs text-muted-foreground">{nextLevel.description}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
