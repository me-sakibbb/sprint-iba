// ============================================
// Global VP Leaderboard Component
// Premium global ranking display with top 3 podium, pagination, search, and real-time updates
// ============================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, TrendingUp, Search, Flame, ChevronDown, Users, Target } from 'lucide-react';
import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { formatVPFull } from '@/utils/pointCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface VPLeaderboardProps {
    limit?: number;
}

export function VPLeaderboard({ limit = 50 }: VPLeaderboardProps) {
    const { user } = useAuth();
    const {
        entries,
        userRank,
        loading,
        loadingMore,
        hasMore,
        totalUsers,
        searchQuery,
        timeFilter,
        handleSearch,
        handleTimeFilterChange,
        loadMore,
    } = useLeaderboard({ initialLimit: limit, pageSize: 20 });

    // Split entries into top 3 and rest
    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);

    /**
     * Get rank icon for display
     */
    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
            case 2:
                return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
            case 3:
                return <Medal className="w-6 h-6 text-orange-600 fill-orange-600" />;
            default:
                return <Award className="w-5 h-5 text-muted-foreground" />;
        }
    };

    /**
     * Get rank badge style
     */
    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">1st</Badge>;
        if (rank === 2) return <Badge className="bg-gray-400 text-white hover:bg-gray-500">2nd</Badge>;
        if (rank === 3) return <Badge className="bg-orange-600 text-white hover:bg-orange-700">3rd</Badge>;
        return <Badge variant="outline">#{rank}</Badge>;
    };

    /**
     * Get podium styling based on rank
     */
    const getPodiumStyle = (rank: number) => {
        const baseClasses = "relative rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105";

        switch (rank) {
            case 1:
                return cn(
                    baseClasses,
                    "bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-100 dark:from-yellow-950/30 dark:via-yellow-900/30 dark:to-amber-900/30",
                    "border-yellow-400 dark:border-yellow-600",
                    "shadow-xl shadow-yellow-500/30"
                );
            case 2:
                return cn(
                    baseClasses,
                    "bg-gradient-to-br from-gray-50 via-gray-100 to-slate-100 dark:from-gray-950/30 dark:via-gray-900/30 dark:to-slate-900/30",
                    "border-gray-400 dark:border-gray-600",
                    "shadow-xl shadow-gray-500/30"
                );
            case 3:
                return cn(
                    baseClasses,
                    "bg-gradient-to-br from-orange-50 via-orange-100 to-red-100 dark:from-orange-950/30 dark:via-orange-900/30 dark:to-red-900/30",
                    "border-orange-400 dark:border-orange-600",
                    "shadow-xl shadow-orange-500/30"
                );
            default:
                return baseClasses;
        }
    };

    /**
     * Render Top 3 Podium
     */
    const renderPodium = () => {
        if (top3.length === 0) return null;

        // Reorder for podium layout: 2nd, 1st, 3rd
        const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

        return (
            <div className="mb-12 animate-fade-in-up">
                <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Top 3 Champions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {podiumOrder.map((entry, index) => {
                        if (!entry) return null;
                        const actualRank = entry.global_rank;
                        const isCurrentUser = user?.id === entry.user_id;

                        // Adjust height for visual hierarchy
                        const heightClass = actualRank === 1 ? "md:translate-y-0" : actualRank === 2 ? "md:translate-y-4" : "md:translate-y-8";

                        return (
                            <div
                                key={entry.user_id}
                                className={cn(getPodiumStyle(actualRank), heightClass)}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Rank Icon */}
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <div className="w-12 h-12 rounded-full bg-background border-2 border-current flex items-center justify-center">
                                        {getRankIcon(actualRank)}
                                    </div>
                                </div>

                                {/* User Avatar */}
                                <div className="flex flex-col items-center mt-4">
                                    <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-800 shadow-lg">
                                        <AvatarImage src={entry.avatar_url || undefined} />
                                        <AvatarFallback className="text-xl font-bold">
                                            {entry.full_name?.[0] || entry.email[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="text-center mt-4">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <p className="font-bold text-lg truncate max-w-[180px]">
                                                {entry.full_name || 'Anonymous'}
                                            </p>
                                            {isCurrentUser && (
                                                <Badge variant="secondary" className="text-xs">You</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {entry.level_name || 'Rookie'}
                                        </p>

                                        {/* VP Display */}
                                        <div className="text-center">
                                            <p className="text-2xl font-bold gradient-text">
                                                {formatVPFull(entry.total_vp)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Velocity Points</p>
                                        </div>

                                        {/* Streaks */}
                                        {(entry.login_streak > 0 || entry.practice_streak > 0) && (
                                            <div className="flex items-center justify-center gap-3 mt-3">
                                                {entry.login_streak > 0 && (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <Flame className="w-4 h-4 text-orange-500" />
                                                        <span>{entry.login_streak}d</span>
                                                    </div>
                                                )}
                                                {entry.practice_streak > 0 && (
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <Target className="w-4 h-4 text-blue-500" />
                                                        <span>{entry.practice_streak}d</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    /**
     * Render regular rank card (4+)
     */
    const renderRankCard = (entry: LeaderboardEntry, index: number) => {
        const isCurrentUser = user?.id === entry.user_id;
        const rank = entry.global_rank;

        return (
            <div
                key={entry.user_id}
                className={cn(
                    "group flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                    "border border-border/50 hover:border-accent/50",
                    "hover:bg-accent/5 hover:shadow-lg hover:-translate-y-1",
                    isCurrentUser && "bg-primary/5 ring-2 ring-primary/30"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
            >
                {/* Rank Number */}
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted/50 font-bold text-lg">
                    #{rank}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback>
                        {entry.full_name?.[0] || entry.email[0].toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">
                            {entry.full_name || 'Anonymous'}
                        </p>
                        {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                            {entry.level_name || 'Level 1'}
                        </p>
                        {/* Streaks */}
                        {(entry.login_streak > 0 || entry.practice_streak > 0) && (
                            <div className="flex items-center gap-2">
                                {entry.login_streak > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-orange-500">
                                        <Flame className="w-3 h-3" />
                                        <span>{entry.login_streak}</span>
                                    </div>
                                )}
                                {entry.practice_streak > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-blue-500">
                                        <Target className="w-3 h-3" />
                                        <span>{entry.practice_streak}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* VP Display */}
                <div className="text-right">
                    <p className="font-bold text-lg">{formatVPFull(entry.total_vp)}</p>
                    <p className="text-xs text-muted-foreground">VP</p>
                </div>
            </div>
        );
    };

    /**
     * Render loading skeletons
     */
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Podium skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full rounded-2xl" />
                    ))}
                </div>
                {/* List skeletons */}
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Statistics Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-2">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
                                <p className=" text-sm text-muted-foreground">Total Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {userRank ? `#${userRank.global_rank}` : '--'}
                                </p>
                                <p className="text-sm text-muted-foreground">Your Rank</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {userRank ? `${((userRank.global_rank / totalUsers) * 100).toFixed(1)}%` : '--'}
                                </p>
                                <p className="text-sm text-muted-foreground">Percentile</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Top 3 Podium */}
            {renderPodium()}

            {/* Rest of Rankings */}
            {rest.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                        Rankings
                    </h3>
                    <div className="space-y-3 animate-fade-in-up">
                        {rest.map((entry, index) => renderRankCard(entry, index))}
                    </div>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && !loading && (
                <div className="flex justify-center pt-6">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="gap-2"
                    >
                        {loadingMore ? (
                            <>Loading...</>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4" />
                                Load More
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {entries.length === 0 && !loading && (
                <div className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold mb-2">No Rankings Yet</p>
                    <p className="text-muted-foreground">
                        {searchQuery ? 'No users found matching your search.' : 'Be the first to earn Velocity Points!'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default VPLeaderboard;
