"use client";

import { useState } from 'react';
import StreakCelebrationModal from '@/components/progression/StreakCelebrationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StreakModalTestPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState({
        streakType: 'login' as 'login' | 'practice',
        streakCount: 1,
        vpAwarded: 50,
        multiplier: 1.0,
        basePoints: 50,
        bonusPoints: 0,
        nextMilestone: 7 as number | null,
    });

    const testScenarios = [
        {
            name: 'Day 1 Login Streak',
            description: 'First day login, no multiplier',
            data: {
                streakType: 'login' as const,
                streakCount: 1,
                vpAwarded: 50,
                multiplier: 1.0,
                basePoints: 50,
                bonusPoints: 0,
                nextMilestone: 7,
            }
        },
        {
            name: 'Day 7 Login Streak (1.5x)',
            description: '7-day streak with 1.5x multiplier',
            data: {
                streakType: 'login' as const,
                streakCount: 7,
                vpAwarded: 75,
                multiplier: 1.5,
                basePoints: 50,
                bonusPoints: 25,
                nextMilestone: 14,
            }
        },
        {
            name: 'Day 14 Practice Streak (2x)',
            description: '14-day practice streak with 2x multiplier',
            data: {
                streakType: 'practice' as const,
                streakCount: 14,
                vpAwarded: 200,
                multiplier: 2.0,
                basePoints: 100,
                bonusPoints: 100,
                nextMilestone: 30,
            }
        },
        {
            name: 'Day 30 Login Streak (2.5x)',
            description: '30-day streak with 2.5x multiplier',
            data: {
                streakType: 'login' as const,
                streakCount: 30,
                vpAwarded: 125,
                multiplier: 2.5,
                basePoints: 50,
                bonusPoints: 75,
                nextMilestone: null,
            }
        },
        {
            name: 'Day 50 Practice Streak (2.5x)',
            description: '50-day practice streak, max multiplier',
            data: {
                streakType: 'practice' as const,
                streakCount: 50,
                vpAwarded: 250,
                multiplier: 2.5,
                basePoints: 100,
                bonusPoints: 150,
                nextMilestone: null,
            }
        },
        {
            name: 'Day 5 Practice Streak',
            description: '5-day practice streak, no multiplier yet',
            data: {
                streakType: 'practice' as const,
                streakCount: 5,
                vpAwarded: 100,
                multiplier: 1.0,
                basePoints: 100,
                bonusPoints: 0,
                nextMilestone: 7,
            }
        },
    ];

    const openModal = (scenario: typeof testScenarios[0]) => {
        setModalData(scenario.data);
        setModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Streak Modal Test Page</h1>
                    <p className="text-muted-foreground">
                        Click any scenario below to test the streak celebration modal
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {testScenarios.map((scenario, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="text-lg">{scenario.name}</CardTitle>
                                <CardDescription>{scenario.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type:</span>
                                        <span className="font-semibold capitalize">{scenario.data.streakType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Streak:</span>
                                        <span className="font-semibold">{scenario.data.streakCount} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">VP:</span>
                                        <span className="font-semibold text-green-500">+{scenario.data.vpAwarded} VP</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Multiplier:</span>
                                        <span className="font-semibold">{scenario.data.multiplier}x</span>
                                    </div>
                                    {scenario.data.bonusPoints > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Bonus:</span>
                                            <span className="font-semibold text-yellow-500">+{scenario.data.bonusPoints} VP</span>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={() => openModal(scenario)}
                                    className="w-full mt-4"
                                >
                                    Test Modal
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle>Testing Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Click any scenario card to open the modal</li>
                            <li>Check confetti animation on modal open</li>
                            <li>Verify fire icons match streak count (1-4 icons)</li>
                            <li>Confirm multiplier badge appears for 7, 14, 30+ day streaks</li>
                            <li>Check points breakdown shows base + bonus correctly</li>
                            <li>Verify "Next Milestone" shows correctly (or hidden if at max)</li>
                            <li>Test manual close button (no auto-close)</li>
                            <li>Orange theme = Login, Purple theme = Practice</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Modal */}
            <StreakCelebrationModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                streakType={modalData.streakType}
                streakCount={modalData.streakCount}
                vpAwarded={modalData.vpAwarded}
                multiplier={modalData.multiplier}
                basePoints={modalData.basePoints}
                bonusPoints={modalData.bonusPoints}
                nextMilestone={modalData.nextMilestone}
            />
        </div>
    );
}
