"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Play, Calendar, AlertCircle } from "lucide-react";
import { MarkdownText } from "@/components/MarkdownText";
import type { MistakeWithQuestion } from "@/hooks/useMistakes";
import { useRouter } from "next/navigation";

interface MistakeCardProps {
    mistake: MistakeWithQuestion;
}

export default function MistakeCard({ mistake }: MistakeCardProps) {
    const [expanded, setExpanded] = useState(false);
    const router = useRouter();

    const getSeverityColor = (level?: string) => {
        switch (level) {
            case 'critical':
                return 'bg-red-500/10 text-red-500 border-red-500';
            case 'high':
                return 'bg-orange-500/10 text-orange-500 border-orange-500';
            case 'medium':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500';
            default:
                return 'bg-blue-500/10 text-blue-500 border-blue-500';
        }
    };

    const getDifficultyColor = (difficulty?: string | null) => {
        switch (difficulty) {
            case 'hard':
                return 'border-red-500 text-red-500';
            case 'medium':
                return 'border-yellow-500 text-yellow-500';
            case 'easy':
                return 'border-green-500 text-green-500';
            default:
                return '';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    const getOptionText = (option: any) => {
        if (!option) return '';
        if (typeof option === 'string') return option;
        if (typeof option === 'object' && option.text) return option.text;
        return String(option);
    };

    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    const userAnswerIndex = optionLabels.indexOf(mistake.user_answer || '');
    const correctAnswerIndex = optionLabels.indexOf(mistake.correct_answer);

    const rawUserOption = mistake.question?.options?.[userAnswerIndex];
    const rawCorrectOption = mistake.question?.options?.[correctAnswerIndex];

    const userAnswerText = getOptionText(rawUserOption) || mistake.user_answer || 'Skipped';
    const correctAnswerText = getOptionText(rawCorrectOption) || mistake.correct_answer;

    // Truncate question text for preview
    const questionPreview = typeof mistake.question?.question_text === 'string'
        ? mistake.question.question_text.substring(0, 150)
        : '';
    const isTruncated = (typeof mistake.question?.question_text === 'string'
        ? mistake.question.question_text.length
        : 0) > 150;

    return (
        <Card className="border-border/40 hover:border-primary/30 transition-all">
            <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            {mistake.topic && (
                                <Badge variant="secondary" className="text-xs">
                                    {mistake.topic}
                                </Badge>
                            )}
                            {mistake.subtopic && (
                                <Badge variant="outline" className="text-xs">
                                    {mistake.subtopic}
                                </Badge>
                            )}
                            {mistake.difficulty && (
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${getDifficultyColor(mistake.difficulty)}`}
                                >
                                    {mistake.difficulty}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(mistake.created_at)}
                            </div>
                        </div>
                    </div>

                    {mistake.mistake_stats && (
                        <Badge
                            variant="outline"
                            className={`shrink-0 ${getSeverityColor(mistake.mistake_stats.severity_level)}`}
                        >
                            {mistake.mistake_stats.severity_level?.toUpperCase()}
                        </Badge>
                    )}
                </div>

                {/* Performance Stats */}
                {mistake.mistake_stats && (
                    <div className="flex items-center gap-4 mb-4 p-2 rounded-lg bg-muted/30 border border-border/50 w-fit">
                        <div className="flex items-center gap-2 px-2 py-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-semibold">Wrong: {mistake.mistake_stats.mistake_count} times</span>
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <div className="flex items-center gap-2 px-2 py-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm font-semibold">Correct after: {mistake.mistake_stats.correct_after_last_mistake} times</span>
                        </div>
                    </div>
                )}

                {/* Question Preview */}
                <div className="mb-4">
                    <div className="text-base leading-relaxed">
                        {expanded ? (
                            <MarkdownText text={mistake.question?.question_text || ''} />
                        ) : (
                            <>
                                <MarkdownText text={questionPreview + (isTruncated ? '...' : '')} />
                                {isTruncated && (
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => setExpanded(true)}
                                        className="p-0 h-auto text-primary ml-1">
                                        Read more
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    {expanded && mistake.question?.image_url && (
                        <div className="mt-3">
                            <img
                                src={mistake.question.image_url}
                                alt="Question"
                                className="max-w-full rounded-lg"
                            />
                        </div>
                    )}
                </div>

                {/* Answer Comparison */}
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <div className="text-xs font-medium text-red-600 mb-1">Your Answer</div>
                        <div className="text-sm">
                            {mistake.user_answer ? (
                                <>
                                    <span className="font-bold">{getOptionText(mistake.user_answer)}.</span> {userAnswerText}
                                </>
                            ) : (
                                <span className="text-muted-foreground italic">Skipped</span>
                            )}
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <div className="text-xs font-medium text-green-600 mb-1">Correct Answer</div>
                        <div className="text-sm">
                            <span className="font-bold">{getOptionText(mistake.correct_answer)}.</span> {correctAnswerText}
                        </div>
                    </div>
                </div>

                {/* Explanation (when expanded) */}
                {expanded && mistake.question?.explanation && (
                    <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="text-sm font-medium text-primary mb-2">Explanation</div>
                        <div className="text-sm text-foreground/90 leading-relaxed">
                            <MarkdownText text={mistake.question.explanation} />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button
                        variant={expanded ? "ghost" : "default"}
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="flex-1 sm:flex-none"
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                Show Details
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card >
    );
}
