import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const GameControls = ({ player, onMove }: { player: any, onMove: (pos: number) => void }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [loadingQ, setLoadingQ] = useState(false);
    const [quizStartTime, setQuizStartTime] = useState<number>(0);
    const [moveResult, setMoveResult] = useState<number | null>(null);

    // Fetch a random question
    const startTurn = async () => {
        setMoveResult(null);
        setLoadingQ(true);
        // Fetch a random question from 'questions' table
        // For efficiency, we might just pick a random ID or use a stored procedure, 
        // but for MVP let's fetch a small batch and pick one.
        const { data } = await supabase.from('questions')
            .select('*')
            .eq('subtopic', 'Sentence Correction') // Use our known good unit
            .limit(10); // Simple randomizer

        if (data && data.length > 0) {
            const randomQ = data[Math.floor(Math.random() * data.length)];

            // Ensure options format
            let opts = randomQ.options;
            if (!Array.isArray(opts) && typeof opts === 'object') {
                opts = Object.entries(opts).map(([k, v]) => ({ id: k, text: v }));
            }

            setCurrentQuestion({ ...randomQ, options: opts });
            setShowQuiz(true);
            setQuizStartTime(Date.now());
        }
        setLoadingQ(false);
    };

    const handleAnswer = async (optionId: string) => {
        if (!currentQuestion) return;

        const timeTakenMs = Date.now() - quizStartTime;
        const isCorrect = optionId === currentQuestion.correct_answer;

        let steps = 0;
        if (isCorrect) {
            // Speed Bonus Logic
            // < 3s = 6 steps
            // < 5s = 5 steps
            // < 8s = 4 steps
            // < 12s = 3 steps
            // < 15s = 2 steps
            // else 1 step
            const sec = timeTakenMs / 1000;
            if (sec < 3) steps = 6;
            else if (sec < 5) steps = 5;
            else if (sec < 8) steps = 4;
            else if (sec < 12) steps = 3;
            else if (sec < 15) steps = 2;
            else steps = 1;
        } else {
            // Wrong answer penalty? For now, just 0 move or 1 move pity?
            // Let's say 0 steps if wrong.
            steps = 0;
        }

        // Close Quiz
        setShowQuiz(false);
        setMoveResult(steps);

        if (steps > 0) {
            // Calculate new position
            const currentPos = player.position_index || 0;
            const newPos = (currentPos + steps) % 40;

            // Persist
            await supabase.from('game_players').update({ position_index: newPos }).eq('id', player.id);
            onMove(newPos);
        }
    };

    return (
        <div className="relative">
            {/* Result pop-up */}
            <AnimatePresence>
                {moveResult !== null && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: -50, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[120%] font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap ${moveResult > 0 ? 'bg-emerald-500 text-slate-900' : 'bg-red-500 text-white'}`}
                    >
                        {moveResult > 0 ? `Speed Bonus! Moved ${moveResult} tiles!` : 'Missed! Stay put.'}
                    </motion.div>
                )}
            </AnimatePresence>

            <Card className="bg-slate-900/90 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-4">
                <Button
                    size="lg"
                    className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/20"
                    onClick={startTurn}
                    disabled={loadingQ}
                >
                    {loadingQ ? <Zap className="animate-spin" /> : <Zap className="w-8 h-8" />}
                </Button>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Your Turn</span>
                    <h3 className="font-bold text-slate-200">Quick Move</h3>
                </div>

                <div className="px-4 text-xs text-slate-500 max-w-[150px] leading-tight hidden md:block">
                    Answer fast to move further! Correct answer required.
                </div>
            </Card>

            {/* Quiz Modal */}
            <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Timer className="w-5 h-5 text-yellow-500 animate-pulse" />
                            <span>Speed Question</span>
                        </DialogTitle>
                    </DialogHeader>

                    {currentQuestion && (
                        <div className="space-y-4 py-4">
                            <p className="text-lg font-medium leading-relaxed">{currentQuestion.question_text}</p>
                            <div className="grid gap-3">
                                {Array.isArray(currentQuestion.options) && currentQuestion.options.map((opt: any) => (
                                    <Button
                                        key={opt.id}
                                        variant="outline"
                                        className="justify-start h-auto py-3 px-4 border-slate-700 hover:bg-slate-800 hover:text-emerald-400 text-left"
                                        onClick={() => handleAnswer(opt.id)}
                                    >
                                        <span className="font-mono text-slate-500 mr-3">{opt.id}.</span>
                                        {opt.text}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export default GameControls;
