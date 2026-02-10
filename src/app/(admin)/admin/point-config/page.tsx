'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getPointConfig, clearConfigCache } from '@/utils/pointCalculations';
import type { PointConfig } from '@/utils/pointCalculations';
import { Loader2, Save, RefreshCw } from 'lucide-react';

export default function PointConfigurationPage() {
    const [config, setConfig] = useState<PointConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load configuration
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const pointConfig = await getPointConfig();
            setConfig(pointConfig);
        } catch (error) {
            console.error('Error loading configuration:', error);
            toast.error('Failed to load point configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;

        try {
            setSaving(true);

            // Update each configuration key
            const updates = Object.entries(config).map(async ([key, value]) => {
                const { error } = await supabase
                    .from('point_configuration' as any)
                    .update({ config_value: value })
                    .eq('config_key', key);

                if (error) throw error;
            });

            await Promise.all(updates);

            // Clear cache to force reload
            clearConfigCache();

            toast.success('Point configuration updated successfully!');
        } catch (error) {
            console.error('Error saving configuration:', error);
            toast.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Are you sure you want to reset to default values?')) return;

        clearConfigCache();
        await loadConfig();
        toast.info('Configuration reloaded');
    };

    if (loading || !config) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Point System Configuration</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure VP values, streak bonuses, and point system behavior
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} disabled={saving}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="answers" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="answers">Answers</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="exams">Exams</TabsTrigger>
                    <TabsTrigger value="streaks">Streaks</TabsTrigger>
                </TabsList>

                {/* Answer Points */}
                <TabsContent value="answers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Correct Answer Points</CardTitle>
                            <CardDescription>VP awarded for answering questions correctly</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Easy</Label>
                                    <Input
                                        type="number"
                                        value={config.point_values_correct.easy}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                point_values_correct: {
                                                    ...config.point_values_correct,
                                                    easy: Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Medium</Label>
                                    <Input
                                        type="number"
                                        value={config.point_values_correct.medium}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                point_values_correct: {
                                                    ...config.point_values_correct,
                                                    medium: Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Hard</Label>
                                    <Input
                                        type="number"
                                        value={config.point_values_correct.hard}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                point_values_correct: {
                                                    ...config.point_values_correct,
                                                    hard: Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Wrong Answer Penalties</CardTitle>
                            <CardDescription>VP deducted for incorrect answers (use negative values)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Easy</Label>
                                    <Input
                                        type="number"
                                        value={config.point_values_wrong.easy}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                point_values_wrong: {
                                                    ...config.point_values_wrong,
                                                    easy: Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Medium</Label>
                                    <Input
                                        type="number"
                                        value={config.point_values_wrong.medium}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                point_values_wrong: {
                                                    ...config.point_values_wrong,
                                                    medium: Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Hard</Label>
                                    <Input
                                        type="number"
                                        value={config.point_values_wrong.hard}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                point_values_wrong: {
                                                    ...config.point_values_wrong,
                                                    hard: Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Speed Bonus</CardTitle>
                            <CardDescription>Maximum time-based bonus for timed mode</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-sm">
                                <Label>Max Speed Bonus (VP)</Label>
                                <Input
                                    type="number"
                                    value={config.speed_bonus_max}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            speed_bonus_max: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Session Bonuses */}
                <TabsContent value="sessions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Practice Session Bonuses</CardTitle>
                            <CardDescription>VP awarded for completing practice sessions</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Session Completion</Label>
                                    <Input
                                        type="number"
                                        value={config.session_completion_bonus}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                session_completion_bonus: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Perfect Score (100%)</Label>
                                    <Input
                                        type="number"
                                        value={config.perfect_score_bonus}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                perfect_score_bonus: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>High Score Threshold (%)</Label>
                                    <Input
                                        type="number"
                                        value={config.high_score_threshold}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                high_score_threshold: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>High Score Bonus</Label>
                                    <Input
                                        type="number"
                                        value={config.high_score_bonus}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                high_score_bonus: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Exam Bonuses */}
                <TabsContent value="exams" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Exam Bonuses</CardTitle>
                            <CardDescription>VP awarded for exam completion and performance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Exam Completion</Label>
                                    <Input
                                        type="number"
                                        value={config.exam_completion_bonus}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                exam_completion_bonus: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Perfect Score</Label>
                                    <Input
                                        type="number"
                                        value={config.exam_perfect_bonus}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                exam_perfect_bonus: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Top 10% Ranking</Label>
                                    <Input
                                        type="number"
                                        value={config.exam_top_10_bonus}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                exam_top_10_bonus: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Streaks */}
                <TabsContent value="streaks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Streak Bonuses</CardTitle>
                            <CardDescription>VP awarded for maintaining daily streaks</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Login Streak (per day)</Label>
                                    <Input
                                        type="number"
                                        value={config.login_streak_daily}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                login_streak_daily: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Practice Streak (per day)</Label>
                                    <Input
                                        type="number"
                                        value={config.practice_streak_daily}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                practice_streak_daily: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Min Questions for Practice Streak</Label>
                                    <Input
                                        type="number"
                                        value={config.min_practice_questions}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                min_practice_questions: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Streak Multipliers</CardTitle>
                            <CardDescription>Bonus multipliers applied at streak milestones</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>7 Days (Multiplier)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={config.streak_multipliers['7']}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                streak_multipliers: {
                                                    ...config.streak_multipliers,
                                                    '7': Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>14 Days (Multiplier)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={config.streak_multipliers['14']}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                streak_multipliers: {
                                                    ...config.streak_multipliers,
                                                    '14': Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>30 Days (Multiplier)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={config.streak_multipliers['30']}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                streak_multipliers: {
                                                    ...config.streak_multipliers,
                                                    '30': Number(e.target.value),
                                                },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
