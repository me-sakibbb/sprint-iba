import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface Question {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    subject: string;
    unit: string;
}

interface QuestionOverlayProps {
    question: Question | null;
    isVisible: boolean;
    onAnswer: (selectedOption: 'A' | 'B' | 'C' | 'D', isCorrect: boolean) => void;
    onClose: () => void;
}

const QuestionOverlay: React.FC<QuestionOverlayProps> = ({
    question,
    isVisible,
    onAnswer,
    onClose,
}) => {
    const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    if (!isVisible || !question) return null;

    const handleSubmit = () => {
        if (!selectedOption) return;

        const correct = selectedOption === question.correct_option;
        setIsCorrect(correct);
        setShowFeedback(true);

        // Wait 2 seconds before calling onAnswer
        setTimeout(() => {
            onAnswer(selectedOption, correct);
            // Reset state
            setSelectedOption(null);
            setShowFeedback(false);
        }, 2000);
    };

    const options = [
        { key: 'A' as const, text: question.option_a },
        { key: 'B' as const, text: question.option_b },
        { key: 'C' as const, text: question.option_c },
        { key: 'D' as const, text: question.option_d },
    ];

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Numbers Town Challenge</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {question.subject} - {question.unit}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="absolute top-4 right-4"
                            disabled={showFeedback}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Question Text */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                        <p className="text-lg font-medium">{question.question_text}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                        {options.map((option) => (
                            <button
                                key={option.key}
                                onClick={() => !showFeedback && setSelectedOption(option.key)}
                                disabled={showFeedback}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedOption === option.key
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    } ${showFeedback ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${selectedOption === option.key
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-200 dark:bg-slate-700'
                                            }`}
                                    >
                                        {option.key}
                                    </div>
                                    <span className="flex-1">{option.text}</span>
                                    {showFeedback && option.key === question.correct_option && (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    )}
                                    {showFeedback &&
                                        selectedOption === option.key &&
                                        option.key !== question.correct_option && (
                                            <X className="h-5 w-5 text-red-500" />
                                        )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Feedback */}
                    {showFeedback && (
                        <div
                            className={`p-4 rounded-lg flex items-center gap-3 ${isCorrect
                                    ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                                }`}
                        >
                            {isCorrect ? (
                                <>
                                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-green-900 dark:text-green-100">
                                            Correct! Well done! 🎉
                                        </p>
                                        <p className="text-sm text-green-700 dark:text-green-300">
                                            The battle will begin shortly...
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-red-900 dark:text-red-100">
                                            Not quite right!
                                        </p>
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            The correct answer was: {question.correct_option}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>

                {!showFeedback && (
                    <CardFooter>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedOption}
                            className="w-full"
                            size="lg"
                        >
                            Submit Answer
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default QuestionOverlay;
