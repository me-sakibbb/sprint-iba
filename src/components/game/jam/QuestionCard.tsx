import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Droplets, CloudFog } from 'lucide-react';

interface QuestionCardProps {
    question: any;
    onAnswer: (option: string, doubleDown: boolean) => void;
    activeEffects: string[]; // ['INK', 'FOG', '5050']
    disabled: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer, activeEffects, disabled }) => {
    const [doubleDown, setDoubleDown] = useState(false);
    const [inkClicks, setInkClicks] = useState(0);

    const isInked = activeEffects.includes('INK') && inkClicks < 3;
    const isFogged = activeEffects.includes('FOG');
    const is5050 = activeEffects.includes('5050');

    // Filter options for 50/50
    const getDisplayOptions = () => {
        if (!question || !question.options) return [];
        if (!is5050) return question.options;
        // Keep correct + 1 random wrong
        const correct = question.correct_answer;
        const wrongs = question.options.filter((o: string) => o !== correct);
        const randomWrong = wrongs[Math.floor(Math.random() * wrongs.length)];
        // Return in original order if possible, or just shuffled pair
        return question.options.filter((o: string) => o === correct || o === randomWrong);
    };

    const displayOptions = getDisplayOptions();

    return (
        <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur border-slate-700 p-8 relative overflow-hidden shadow-2xl">

            {/* INK EFFECT OVERLAY */}
            {isInked && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
                    onClick={() => setInkClicks(prev => prev + 1)}
                >
                    <div className="text-center animate-pulse">
                        <Droplets className="w-24 h-24 text-slate-800 mx-auto mb-4" />
                        <h2 className="text-4xl font-black text-slate-700 uppercase">Ink Splat!</h2>
                        <p className="text-slate-500">Click {3 - inkClicks} times to wipe!</p>
                    </div>
                </div>
            )}

            {/* Question Header */}
            <div className="mb-8 text-center relative z-10">
                <span className="inline-block px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full mb-4 uppercase tracking-widest">
                    {question.question_type || 'MCQ'}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    {question.question_text}
                </h2>
            </div>

            {/* Double Down Toggle */}
            <div className="flex items-center justify-center gap-2 mb-6">
                <Switch
                    id="double-down"
                    checked={doubleDown}
                    onCheckedChange={setDoubleDown}
                    className="data-[state=checked]:bg-red-600"
                />
                <Label htmlFor="double-down" className={`font-bold cursor-pointer select-none ${doubleDown ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                    DOUBLE DOWN (2x Risk/Reward)
                </Label>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayOptions.map((option: string, idx: number) => (
                    <Button
                        key={idx}
                        variant="outline"
                        className={cn(
                            "h-auto py-6 text-lg font-medium border-2 border-slate-700 hover:border-cyan-500 hover:bg-slate-800/50 transition-all",
                            isFogged && "blur-sm hover:blur-none transition-all duration-1000"
                        )}
                        onClick={() => !disabled && onAnswer(option, doubleDown)}
                        disabled={disabled || isInked}
                    >
                        {option}
                    </Button>
                ))}
            </div>

            {/* Fog Indicator */}
            {isFogged && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-slate-500 text-xs">
                    <CloudFog className="w-4 h-4" /> Brain Fog Active
                </div>
            )}
        </Card>
    );
};

export default QuestionCard;
