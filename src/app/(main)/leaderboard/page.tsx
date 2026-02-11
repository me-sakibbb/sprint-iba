'use client';

import React from 'react';
import VPLeaderboard from '@/components/leaderboard/VPLeaderboard';
import { Trophy, Sparkles } from 'lucide-react';

export default function LeaderboardPage() {
    return (
        <div className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
            {/* Premium Header */}
            <div className="mb-10 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-lg">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold gradient-text">Global Leaderboard</h1>
                            <p className="text-muted-foreground text-lg mt-1">
                                Compete with learners worldwide
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        <span className="text-sm font-semibold">Live Rankings</span>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground">
                        Rankings are updated in real-time based on <span className="font-semibold text-foreground">Velocity Points (VP)</span>.
                        Earn VP by answering questions correctly, maintaining streaks, completing exams, and achieving milestones.
                        The more you learn, the higher you climb! 🚀
                    </p>
                </div>
            </div>

            {/* Leaderboard Component */}
            <VPLeaderboard limit={50} />
        </div>
    );
}
