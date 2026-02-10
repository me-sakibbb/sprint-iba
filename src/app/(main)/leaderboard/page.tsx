'use client';

import React from 'react';
import VPLeaderboard from '@/components/leaderboard/VPLeaderboard';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
    return (
        <div className="container mx-auto px-6 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Leaderboard</h1>
                        <p className="text-muted-foreground">Top performers by Velocity Points</p>
                    </div>
                </div>
            </div>

            {/* Leaderboard Component */}
            <VPLeaderboard limit={50} />
        </div>
    );
}
