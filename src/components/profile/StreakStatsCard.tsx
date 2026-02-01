// ============================================
// Streak Stats Card Component
// Displays user's streak information and stats
// ============================================

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Target, Award } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { Skeleton } from '@/components/ui/card';

export function StreakStatsCard() {
    const { loginStreak, practiceStreak, streakMultiplier, loading } = usePoints();

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getStreakColor = (streak: number) => {
        if (streak >= 30) return 'text-purple-500';
        if (streak >= 14) return 'text-orange-500';
        if (streak >= 7) return 'text-yellow-500';
        return 'text-gray-500';
    };

    const getStreakLabel = (streak: number) => {
        if (streak >= 30) return 'Legendary';
        if (streak >= 14) return 'Epic';
        if (streak >= 7) return 'Great';
        if (streak >= 3) return 'Good';
        return 'Starting';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                            Daily Streaks
                        </CardTitle>
                        <CardDescription>Keep your momentum going!</CardDescription>
                    </div>
                    {streakMultiplier > 1 && (
                        <Badge variant="outline" className="text-orange-500 border-orange-500">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {streakMultiplier}x Multiplier
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Login Streak */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Login Streak</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-2xl font-bold ${getStreakColor(loginStreak)}`}>
                                    {loginStreak}
                                </p>
                                <span className="text-sm text-muted-foreground">
                                    {loginStreak === 1 ? 'day' : 'days'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Badge variant="secondary">{getStreakLabel(loginStreak)}</Badge>
                </div>

                {/* Practice Streak */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Practice Streak</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-2xl font-bold ${getStreakColor(practiceStreak)}`}>
                                    {practiceStreak}
                                </p>
                                <span className="text-sm text-muted-foreground">
                                    {practiceStreak === 1 ? 'day' : 'days'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Badge variant="secondary">{getStreakLabel(practiceStreak)}</Badge>
                </div>

                {/* Streak Info */}
                <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                        {streakMultiplier > 1
                            ? `Your ${streakMultiplier}x multiplier is active! All VP earned is multiplied.`
                            : 'Reach 7+ day streaks to unlock bonus multipliers!'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default StreakStatsCard;
