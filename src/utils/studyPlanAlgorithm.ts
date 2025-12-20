// AI Study Plan Algorithm
// Analyzes user progress and generates intelligent daily study schedule

export interface QuestionBreakdown {
    easy: { total: number; remaining: number };
    medium: { total: number; remaining: number };
    hard: { total: number; remaining: number };
}

export interface TopicStats {
    topic: string;
    total: number;
    answered: number;
    remaining: number;
    breakdown: QuestionBreakdown;
}

export interface SubjectStats {
    subject: string;
    topics: TopicStats[];
    totalQuestions: number;
    totalAnswered: number;
    totalRemaining: number;
}

export interface DailyAssignment {
    date: Date;
    subjects: {
        subject: string;
        topic: string;
        easy: number;
        medium: number;
        hard: number;
    }[];
    totalQuestions: number;
}

export interface StudyPlan {
    examDate: Date;
    daysUntilExam: number;
    questionsPerDay: number;
    totalRemaining: number;
    dailySchedule: DailyAssignment[];
}

/**
 * Calculate days between two dates
 */
export function getDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Get difficulty distribution weights based on days remaining
 */
export function getDifficultyWeights(daysRemaining: number): {
    easy: number;
    medium: number;
    hard: number;
} {
    // Far from exam: Focus on easy/medium
    if (daysRemaining > 21) {
        return { easy: 0.5, medium: 0.3, hard: 0.2 };
    }
    // Mid preparation: Balanced
    if (daysRemaining > 7) {
        return { easy: 0.3, medium: 0.4, hard: 0.3 };
    }
    // Final week: Focus on medium/hard
    return { easy: 0.2, medium: 0.3, hard: 0.5 };
}

/**
 * Get subject rotation for a given day
 */
export function getSubjectRotation(dayIndex: number): string[] {
    const rotations = [
        ["Math", "English", "Analytical"],
        ["English", "Analytical", "Math"],
        ["Analytical", "Math", "English"],
    ];
    return rotations[dayIndex % 3];
}

/**
 * AI: Analyze topic complexity and priority
 */
interface TopicPriority {
    topic: TopicStats;
    subject: string;
    priorityScore: number;
    complexityLevel: 'high' | 'medium' | 'low';
}

export function analyzeTopicPriority(
    subject: string,
    topic: TopicStats,
    daysRemaining: number
): TopicPriority {
    // Calculate complexity based on difficulty distribution
    const totalQ = topic.remaining;
    const hardRatio = totalQ > 0 ? topic.breakdown.hard.remaining / totalQ : 0;
    const mediumRatio = totalQ > 0 ? topic.breakdown.medium.remaining / totalQ : 0;

    // Complexity score: higher for topics with more hard questions
    const complexityScore = (hardRatio * 3) + (mediumRatio * 2) + ((1 - hardRatio - mediumRatio) * 1);

    // Priority score combines:
    // 1. Number of questions (more = higher priority)
    // 2. Complexity (harder topics prioritized earlier when time permits)
    // 3. Time factor (urgent if near exam with many questions left)
    const volumeScore = Math.min(totalQ / 50, 5); // Cap at 5
    const urgencyScore = totalQ / daysRemaining; // Questions per day needed
    const priorityScore = volumeScore + complexityScore + urgencyScore;

    let complexityLevel: 'high' | 'medium' | 'low' = 'low';
    if (complexityScore > 2.3) complexityLevel = 'high';
    else if (complexityScore > 1.7) complexityLevel = 'medium';

    return {
        topic,
        subject,
        priorityScore,
        complexityLevel
    };
}

/**
 * AI: Smart topic selection based on priority and learning progression
 */
export function selectSmartTopics(
    subjectStats: Map<string, TopicStats[]>,
    daysRemaining: number,
    currentPhase: 'early' | 'mid' | 'final'
): TopicPriority[] {
    const allTopics: TopicPriority[] = [];

    // Analyze all available topics
    subjectStats.forEach((topics, subject) => {
        topics.forEach(topic => {
            if (topic.remaining > 0) {
                allTopics.push(analyzeTopicPriority(subject, topic, daysRemaining));
            }
        });
    });

    // Sort by priority
    allTopics.sort((a, b) => b.priorityScore - a.priorityScore);

    // Phase-based selection
    if (currentPhase === 'early') {
        // Early: Focus on high-complexity topics first (build foundation)
        return allTopics.sort((a, b) => {
            if (a.complexityLevel === b.complexityLevel) {
                return b.priorityScore - a.priorityScore;
            }
            const order = { high: 3, medium: 2, low: 1 };
            return order[b.complexityLevel] - order[a.complexityLevel];
        });
    } else if (currentPhase === 'final') {
        // Final week: Focus on highest priority (most questions remaining)
        return allTopics.sort((a, b) => b.topic.remaining - a.topic.remaining);
    }

    // Mid: Balanced approach
    return allTopics;
}

/**
 * AI: Calculate optimal daily load
 */
export function calculateOptimalDailyLoad(
    totalRemaining: number,
    daysUntilExam: number
): number {
    const basicRate = totalRemaining / daysUntilExam;

    // Optimal range: 20-60 questions per day
    const MIN_DAILY = 20;
    const MAX_DAILY = 60;
    const IDEAL_DAILY = 40;

    if (basicRate < MIN_DAILY) {
        // Spread less
        return Math.max(MIN_DAILY, Math.ceil(totalRemaining / Math.max(1, daysUntilExam * 0.8)));
    }
    if (basicRate > MAX_DAILY) {
        // Need to do more per day
        return Math.min(MAX_DAILY, basicRate);
    }

    // Adjust toward ideal
    return Math.round((basicRate + IDEAL_DAILY) / 2);
}

/**
 * AI: Allocate questions with smart difficulty progression
 */
export function smartAllocateQuestions(
    topicPriority: TopicPriority,
    quota: number,
    weights: { easy: number; medium: number; hard: number },
    topicProgress: number // 0-1, how much of this topic is complete
): { easy: number; medium: number; hard: number } {
    const topic = topicPriority.topic;
    const allocation = { easy: 0, medium: 0, hard: 0 };

    // Adjust weights based on topic progress
    // Early in topic: more easy questions
    // Late in topic: more hard questions
    const progressWeights = {
        easy: weights.easy * (1.3 - topicProgress * 0.5),
        medium: weights.medium,
        hard: weights.hard * (0.7 + topicProgress * 0.5)
    };

    // Normalize
    const total = progressWeights.easy + progressWeights.medium + progressWeights.hard;
    progressWeights.easy /= total;
    progressWeights.medium /= total;
    progressWeights.hard /= total;

    // Calculate ideal distribution
    let idealEasy = Math.round(quota * progressWeights.easy);
    let idealMedium = Math.round(quota * progressWeights.medium);
    let idealHard = Math.round(quota * progressWeights.hard);

    // Ensure we hit quota
    while (idealEasy + idealMedium + idealHard < quota) idealMedium++;
    while (idealEasy + idealMedium + idealHard > quota) idealMedium--;

    // Allocate based on availability
    allocation.easy = Math.min(idealEasy, topic.breakdown.easy.remaining);
    allocation.medium = Math.min(idealMedium, topic.breakdown.medium.remaining);
    allocation.hard = Math.min(idealHard, topic.breakdown.hard.remaining);

    // Fill shortfall intelligently
    const allocated = allocation.easy + allocation.medium + allocation.hard;
    if (allocated < quota) {
        const shortfall = quota - allocated;

        // Priority: medium > easy > hard (medium is most versatile)
        const mediumAvail = topic.breakdown.medium.remaining - allocation.medium;
        const mediumAdd = Math.min(shortfall, mediumAvail);
        allocation.medium += mediumAdd;

        if (mediumAdd < shortfall) {
            const easyAvail = topic.breakdown.easy.remaining - allocation.easy;
            const easyAdd = Math.min(shortfall - mediumAdd, easyAvail);
            allocation.easy += easyAdd;

            if (easyAdd + mediumAdd < shortfall) {
                const hardAvail = topic.breakdown.hard.remaining - allocation.hard;
                allocation.hard += Math.min(shortfall - mediumAdd - easyAdd, hardAvail);
            }
        }
    }

    return allocation;
}

/**
 * AI-Enhanced: Generate intelligent study plan
 */
export function generateStudyPlan(
    examDate: Date,
    subjectStats: SubjectStats[]
): StudyPlan {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysUntilExam = getDaysBetween(today, examDate);

    // Calculate total remaining
    const totalRemaining = subjectStats.reduce(
        (sum, s) => sum + s.totalRemaining,
        0
    );

    // AI: Calculate optimal daily load (not just simple division)
    const questionsPerDay = calculateOptimalDailyLoad(totalRemaining, daysUntilExam);

    // Generate daily schedule
    const dailySchedule: DailyAssignment[] = [];

    // Create a working copy of stats with proper deep copy
    const workingStats: Map<string, TopicStats[]> = new Map();
    subjectStats.forEach(s => {
        workingStats.set(
            s.subject,
            s.topics.map(t => ({
                ...t,
                breakdown: {
                    easy: { ...t.breakdown.easy },
                    medium: { ...t.breakdown.medium },
                    hard: { ...t.breakdown.hard },
                },
            }))
        );
    });

    // Track topic progress for smart allocation
    const topicProgressMap = new Map<string, number>();

    for (let day = 0; day < daysUntilExam; day++) {
        const currentDate = addDays(today, day);
        const daysRemaining = daysUntilExam - day;
        const progressRatio = day / daysUntilExam; // 0 to 1

        // Determine learning phase
        let currentPhase: 'early' | 'mid' | 'final' = 'mid';
        if (daysRemaining > 21) currentPhase = 'early';
        else if (daysRemaining <= 7) currentPhase = 'final';

        const weights = getDifficultyWeights(daysRemaining);

        const dailyAssignment: DailyAssignment = {
            date: currentDate,
            subjects: [],
            totalQuestions: 0,
        };

        // AI: Smart topic selection
        const prioritizedTopics = selectSmartTopics(workingStats, daysRemaining, currentPhase);

        // Distribute across top topics (not just one per subject)
        let remainingQuota = questionsPerDay;
        const MAX_TOPICS_PER_DAY = 5; // Don't overwhelm

        for (let i = 0; i < Math.min(MAX_TOPICS_PER_DAY, prioritizedTopics.length); i++) {
            if (remainingQuota <= 0) break;

            const topicPriority = prioritizedTopics[i];
            const topic = topicPriority.topic;
            const subject = topicPriority.subject;

            // Calculate how much of this topic to assign
            const topicQuota = i === 0
                ? Math.ceil(remainingQuota * 0.4) // First topic gets 40%
                : Math.ceil(remainingQuota / (MAX_TOPICS_PER_DAY - i));

            const actualQuota = Math.min(topicQuota, topic.remaining, remainingQuota);

            if (actualQuota === 0) continue;

            // Get topic progress
            const topicKey = `${subject}:${topic.topic}`;
            const topicProgress = topicProgressMap.get(topicKey) || 0;

            // AI: Smart allocation
            const allocation = smartAllocateQuestions(
                topicPriority,
                actualQuota,
                weights,
                topicProgress
            );

            // Update working stats
            topic.breakdown.easy.remaining -= allocation.easy;
            topic.breakdown.medium.remaining -= allocation.medium;
            topic.breakdown.hard.remaining -= allocation.hard;
            topic.remaining -= allocation.easy + allocation.medium + allocation.hard;

            const totalAllocated = allocation.easy + allocation.medium + allocation.hard;
            if (totalAllocated > 0) {
                dailyAssignment.subjects.push({
                    subject,
                    topic: topic.topic,
                    ...allocation,
                });
                dailyAssignment.totalQuestions += totalAllocated;
                remainingQuota -= totalAllocated;

                // Update topic progress
                const originalTotal = topicPriority.topic.total;
                const newProgress = 1 - (topic.remaining / originalTotal);
                topicProgressMap.set(topicKey, newProgress);
            }
        }

        if (dailyAssignment.subjects.length > 0) {
            dailySchedule.push(dailyAssignment);
        }
    }

    return {
        examDate,
        daysUntilExam,
        questionsPerDay,
        totalRemaining,
        dailySchedule,
    };
}
