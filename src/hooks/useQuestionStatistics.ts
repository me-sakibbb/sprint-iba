import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectStats, TopicStats, QuestionBreakdown } from "@/utils/studyPlanAlgorithm";

interface QuestionCount {
    subject: string;
    topic: string;
    difficulty: string;
    count: number;
}

export function useQuestionStatistics() {
    const { user } = useAuth();
    const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStatistics() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching question statistics...');

                // 1. Get total questions grouped by topic (Math/English/Analytical), subtopic, difficulty
                const { data: totalQuestions, error: totalError } = await supabase
                    .from('questions' as any)
                    .select('id, topic, subtopic, difficulty');

                if (totalError) {
                    console.error('Error fetching questions:', totalError);
                    throw new Error(`Questions query failed: ${totalError.message}`);
                }

                console.log('Total questions:', totalQuestions?.length);

                // 2. Get user's answered questions
                const { data: userProgress, error: progressError } = await supabase
                    .from('user_progress' as any)
                    .select('question_id')
                    .eq('user_id', user.id);

                if (progressError) {
                    console.error('Error fetching user progress:', progressError);
                    throw new Error(`User progress query failed: ${progressError.message}`);
                }

                console.log('Answered questions:', userProgress?.length);

                // Get the actual question data for answered questions
                const answeredQuestionIds = new Set(userProgress?.map((p: any) => p.question_id) || []);
                const answeredQuestions = totalQuestions?.filter((q: any) => answeredQuestionIds.has(q.id)) || [];

                // Count total questions by topic/subtopic/difficulty
                const totalCounts = new Map<string, QuestionCount>();
                totalQuestions?.forEach((q: any) => {
                    const subject = q.topic || 'Unknown'; // Math, English, or Analytical
                    const topicName = q.subtopic || 'Miscellaneous';
                    const difficulty = q.difficulty || 'medium';
                    const key = `${subject}|${topicName}|${difficulty}`;

                    if (!totalCounts.has(key)) {
                        totalCounts.set(key, {
                            subject,
                            topic: topicName,
                            difficulty,
                            count: 0
                        });
                    }
                    totalCounts.get(key)!.count++;
                });

                // Count answered questions by topic/subtopic/difficulty
                const answeredCounts = new Map<string, number>();
                answeredQuestions.forEach((q: any) => {
                    const subject = q.topic || 'Unknown';
                    const topicName = q.subtopic || 'Miscellaneous';
                    const difficulty = q.difficulty || 'medium';
                    const key = `${subject}|${topicName}|${difficulty}`;
                    answeredCounts.set(key, (answeredCounts.get(key) || 0) + 1);
                });

                // Build SubjectStats structure
                const statsMap = new Map<string, Map<string, TopicStats>>();

                totalCounts.forEach((count, key) => {
                    const { subject, topic, difficulty } = count;
                    const answered = answeredCounts.get(key) || 0;
                    const remaining = count.count - answered;

                    if (!statsMap.has(subject)) {
                        statsMap.set(subject, new Map());
                    }

                    const topicMap = statsMap.get(subject)!;
                    if (!topicMap.has(topic)) {
                        topicMap.set(topic, {
                            topic,
                            total: 0,
                            answered: 0,
                            remaining: 0,
                            breakdown: {
                                easy: { total: 0, remaining: 0 },
                                medium: { total: 0, remaining: 0 },
                                hard: { total: 0, remaining: 0 },
                            },
                        });
                    }

                    const topicStat = topicMap.get(topic)!;
                    topicStat.total += count.count;
                    topicStat.answered += answered;
                    topicStat.remaining += remaining;

                    const diffLower = difficulty.toLowerCase();
                    if (diffLower === 'easy') {
                        topicStat.breakdown.easy.total += count.count;
                        topicStat.breakdown.easy.remaining += remaining;
                    } else if (diffLower === 'medium') {
                        topicStat.breakdown.medium.total += count.count;
                        topicStat.breakdown.medium.remaining += remaining;
                    } else if (diffLower === 'hard') {
                        topicStat.breakdown.hard.total += count.count;
                        topicStat.breakdown.hard.remaining += remaining;
                    }
                });

                // Convert to SubjectStats array
                const stats: SubjectStats[] = Array.from(statsMap.entries()).map(([subject, topicMap]) => {
                    const topics = Array.from(topicMap.values());
                    return {
                        subject,
                        topics,
                        totalQuestions: topics.reduce((sum, t) => sum + t.total, 0),
                        totalAnswered: topics.reduce((sum, t) => sum + t.answered, 0),
                        totalRemaining: topics.reduce((sum, t) => sum + t.remaining, 0),
                    };
                });

                console.log('Final stats:', stats);
                setSubjectStats(stats);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching question statistics:', err);
                setError(err instanceof Error ? err.message : 'Failed to load statistics');
                setLoading(false);
            }
        }

        fetchStatistics();
    }, [user]);

    return { subjectStats, loading, error, refetch: () => { } };
}
