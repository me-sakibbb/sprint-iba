import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Timer, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionOverlayProps {
    questionId: string;
    onAnswer: (result: { correct: boolean; timeMs: number }) => void;
}

const QuestionOverlay: React.FC<QuestionOverlayProps> = ({ questionId, onAnswer }) => {
    const [question, setQuestion] = useState<any>(null);
    const [startTime, setStartTime] = useState(0);
    const [answered, setAnswered] = useState(false);

    useEffect(() => {
        if (!questionId) return;

        const fetchQ = async () => {
            const { data } = await supabase
                .from('questions')
                .select('*')
                .eq('id', questionId)
                .single();

            if (data) {
                // Parse options if JSON
                let opts = data.options;
                if (!Array.isArray(opts) && typeof opts === 'object') {
                    opts = Object.entries(opts).map(([k, v]) => ({ id: k, text: v }));
                }
                setQuestion({ ...data, options: opts });
                setStartTime(Date.now());
                setAnswered(false);
            }
        };

        fetchQ();
    }, [questionId]);

    const handleSelect = (optionId: string) => {
        if (answered || !question) return;
        setAnswered(true);

        const timeTaken = Date.now() - startTime;
        const isCorrect = optionId === question.correct_answer;

        // Slight delay to show selection before closing
        setTimeout(() => {
            onAnswer({ correct: isCorrect, timeMs: timeTaken });
        }, 500);
    };

    if (!question || answered) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <Card className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 shadow-2xl p-6 relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold px-4 py-1 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
                    <Timer className="w-4 h-4" />
                    <span>QUICK!</span>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2 text-center">
                        <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Vocabulary Challenge</span>
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                            {question.question_text}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {question.options?.map((opt: any) => (
                            <Button
                                key={opt.id}
                                variant="outline"
                                className="justify-start h-auto py-4 px-6 text-lg border-slate-700 hover:bg-slate-800 hover:border-emerald-500 hover:text-emerald-400 transition-all text-left group"
                                onClick={() => handleSelect(opt.id)}
                            >
                                <span className="font-mono text-slate-600 mr-4 group-hover:text-emerald-500">{opt.id}</span>
                                <span className="flex-1">{opt.text}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default QuestionOverlay;
