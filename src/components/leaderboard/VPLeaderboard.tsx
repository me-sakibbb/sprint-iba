// ============================================
// VP Leaderboard Component
// Displays top users by Velocity Points
// ============================================

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatVPFull } from '@/utils/pointCalculations';
import { getLevelById } from '@/config/levels';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
    user_id: string;
    total_vp: number;
    current_level: number;
    profile: {
        full_name: string | null;
        avatar_url: string | null;
        email: string;
    };
}

export function VPLeaderboard({ limit = 10 }: { limit?: number }) {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, [limit]);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);

            // Fetch top users by VP
            const { data, error } = await supabase
                .from('user_levels' as any)
                .select(`
                    user_id,
                    total_vp,
                    current_level,
                    profiles:user_id (
                        full_name,
                        avatar_url,
                        email
                    )
                `)
                .order('total_vp', { ascending: false })
                .limit(limit);

            if (error) throw error;

            setLeaderboard((data as any) || []);

            // Find current user's rank
            if (user) {
                const userIndex = (data as any)?.findIndex((entry: any) => entry.user_id === user.id);
                setUserRank(userIndex !== -1 ? userIndex + 1 : null);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
            case 2:
                return <Medal className="w-5 h-5 text-gray-400 fill-gray-400" />;
            case 3:
                return <Medal className="w-5 h-5 text-orange-600 fill-orange-600" />;
            default:
                return <Award className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Badge className="bg-yellow-500 text-white">1st</Badge>;
        if (rank === 2) return <Badge className="bg-gray-400 text-white">2nd</Badge>;
        if (rank === 3) return <Badge className="bg-orange-600 text-white">3rd</Badge>;
        return <Badge variant="outline">#{rank}</Badge>;
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            VP Leaderboard
                        </CardTitle>
                        <CardDescription>Top performers by Velocity Points</CardDescription>
                    </div>
                    {userRank && userRank <= limit && (
                        <Badge variant="outline" className="gap-1">
                            Your Rank: #{userRank}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {leaderboard.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No data available</p>
                    ) : (
                        leaderboard.map((entry, index) => {
                            const rank = index + 1;
                            const level = getLevelById(entry.current_level);
                            const isCurrentUser = user?.id === entry.user_id;

                            return (
                                <div
                                    key={entry.user_id}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg transition-colors
                                        ${isCurrentUser
                                            ? 'bg-primary/10 ring-2 ring-primary/20'
                                            : 'hover:bg-muted/50'
                                        }
                                    `}
                                >
                                    {/* Rank */}
                                    <div className="flex items-center justify-center w-10">
                                        {getRankIcon(rank)}
                                    </div>

                                    {/* Avatar */}
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={entry.profile?.avatar_url || undefined} />
                                        <AvatarFallback>
                                            {entry.profile?.full_name?.[0] ||
                                                entry.profile?.email[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold truncate">
                                                {entry.profile?.full_name || 'Anonymous'}
                                            </p>
                                            {isCurrentUser && (
                                                <Badge variant="secondary" className="text-xs">
                                                    You
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {level?.name || 'Level 1'}
                                        </p>
                                    </div>

                                    {/* VP & Rank Badge */}
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-bold">{formatVPFull(entry.total_vp)}</p>
                                            <p className="text-xs text-muted-foreground">VP</p>
                                        </div>
                                        {getRankBadge(rank)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {userRank && userRank > limit && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground text-center">
                            You're ranked #{userRank}. Keep practicing to climb higher!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default VPLeaderboard;
