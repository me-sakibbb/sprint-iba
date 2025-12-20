import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trophy, Zap } from 'lucide-react';

import BossUnit from './BossUnit';
import PowerUpTray from './PowerUpTray';
import QuestionCard from './QuestionCard';
import StreakFire from './StreakFire';

interface JamArenaProps {
    lobbyId: string;
    lobby: any;
    participants: any[];
    isHost: boolean;
}

const JamArena: React.FC<JamArenaProps> = ({ lobbyId, lobby, participants, isHost }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    // --- State ---
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [phase, setPhase] = useState<'IDLE' | 'QUESTION' | 'REVEAL'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(0);
    const [progress, setProgress] = useState(100);

    // Player State
    const [myParticipant, setMyParticipant] = useState<any>(null);
    const [activeEffects, setActiveEffects] = useState<string[]>([]); // Effects on ME
    const [hasAnswered, setHasAnswered] = useState(false);

    // Constants
    const QUESTION_DURATION = 15;
    const REVEAL_DURATION = 3;

    // --- Effects ---

    // 1. Sync Participant & Effects
    useEffect(() => {
        if (user && participants) {
            const me = participants.find(p => p.user_id === user.id);
            setMyParticipant(me);
            // In a real app, we'd sync active effects from DB or Realtime events
            // For now, we'll keep effects local-ish or handled via realtime events listener below
        }
    }, [user, participants]);

    // 2. Sync Question
    useEffect(() => {
        if (lobby?.current_question_id !== currentQuestionId) {
            setCurrentQuestionId(lobby.current_question_id);
            setHasAnswered(false);
            setPhase('QUESTION');
            setActiveEffects([]); // Clear per-question effects like Fog/Ink? Or keep them? Let's clear for fairness.

            // Fetch Question Data
            if (lobby.current_question_id) {
                supabase.from('questions').select('*').eq('id', lobby.current_question_id).single()
                    .then(({ data }) => setCurrentQuestion(data));
            }
        }
    }, [lobby]);

    // 3. Timer Logic
    useEffect(() => {
        if (!lobby.round_start_time || phase === 'IDLE') return;

        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(lobby.round_start_time).getTime();
            const elapsed = (now - start) / 1000;

            if (elapsed < QUESTION_DURATION) {
                setPhase('QUESTION');
                const remaining = QUESTION_DURATION - elapsed;
                setTimeLeft(Math.ceil(remaining));
                setProgress((remaining / QUESTION_DURATION) * 100);
            } else if (elapsed < QUESTION_DURATION + REVEAL_DURATION) {
                setPhase('REVEAL');
                setTimeLeft(0);
                setProgress(0);
            } else {
                setPhase('IDLE');
                if (isHost) triggerNextQuestion();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [lobby.round_start_time, isHost, phase]);

    // --- Actions ---

    const triggerNextQuestion = async () => {
        if (phase !== 'IDLE') return; // Debounce

        const { data: qs, error } = await supabase.from('questions').select('id').limit(50);

        if (error) {
            console.error("Error fetching questions:", error);
            toast({ title: "Database Error", description: "Failed to fetch questions.", variant: "destructive" });
            return;
        }

        if (!qs || !qs.length) {
            toast({ title: "No Questions Found", description: "The question bank is empty!", variant: "destructive" });
            return;
        }

        const randomQ = qs[Math.floor(Math.random() * qs.length)];

        await supabase.from('game_lobbies').update({
            current_question_id: randomQ.id,
            round_start_time: new Date().toISOString(),
            rounds_played: (lobby.rounds_played || 0) + 1,
        }).eq('id', lobbyId);
    };

    const handleAnswer = async (option: string, doubleDown: boolean) => {
        if (!currentQuestion || !user || !myParticipant) return;
        setHasAnswered(true);

        const correct = option === currentQuestion.correct_answer;
        const timeMs = Date.now() - new Date(lobby.round_start_time).getTime();

        // --- Scoring Logic ---
        let points = correct ? 100 : 0;

        // Speed Bonus
        if (correct) {
            const seconds = timeMs / 1000;
            points = Math.max(50, 100 - Math.floor(seconds * 5));
        }

        // Streak Multiplier
        const isStreak = (myParticipant.current_streak || 0) >= 3;
        if (isStreak) points *= 2;

        // Double Down
        if (doubleDown) {
            if (correct) points *= 2;
            else points = -500; // Penalty
        }

        // Boss Damage (Co-op Mode)
        if (correct) {
            const damage = points * 2; // Simple damage formula
            const newBossHp = Math.max(0, (lobby.boss_hp || 10000) - damage);
            await supabase.from('game_lobbies').update({ boss_hp: newBossHp }).eq('id', lobbyId);
        }

        // Update Participant
        const newStreak = correct ? (myParticipant.current_streak || 0) + 1 : 0;

        // Power-Up Grant (Every 3 streak)
        let newInventory = myParticipant.inventory || [];
        if (newStreak > 0 && newStreak % 3 === 0) {
            const items = ['INK', 'FOG', 'FREEZE', '5050'];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            if (newInventory.length < 3) {
                newInventory = [...newInventory, randomItem];
                toast({ title: "Power-Up Unlocked!", description: `You got: ${randomItem}`, className: "bg-yellow-600 text-white" });
            }
        }

        await supabase.from('game_participants').update({
            score: (myParticipant.score || 0) + points,
            current_streak: newStreak,
            inventory: newInventory,
            last_answer_correct: correct,
            last_answer_time: timeMs
        }).eq('id', myParticipant.id);

        if (correct) toast({ title: "Correct!", description: `+${points} PTS`, className: "bg-emerald-600 text-white" });
        else toast({ title: "Wrong!", description: doubleDown ? "-500 PTS (Double Down Fail)" : "0 PTS", variant: "destructive" });
    };

    const usePowerUp = async (item: string) => {
        if (!myParticipant) return;

        // Remove from inventory
        const newInventory = (myParticipant.inventory || []).filter((i: string, idx: number) => idx !== (myParticipant.inventory || []).indexOf(item)); // Remove one instance

        await supabase.from('game_participants').update({ inventory: newInventory }).eq('id', myParticipant.id);

        // Apply Effect
        if (item === '5050') {
            setActiveEffects(prev => [...prev, '5050']);
        } else if (item === 'FREEZE') {
            // Logic to freeze timer (client side visual only for now)
        } else {
            // Offensive: Broadcast to others (Simplified: Just toast for now, needs Realtime channel trigger)
            // In a real implementation, we'd send a supabase channel 'broadcast' event here.
            toast({ title: "Attack Launched!", description: `Used ${item} on opponents!`, className: "bg-red-600 text-white" });
        }
    };

    // --- Render ---

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center relative overflow-hidden p-4">

            {/* Top Bar */}
            <div className="w-full h-20 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 z-40 fixed top-0">
                <div className="flex items-center gap-4">
                    <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-wider">
                        BATTLE ARENA
                    </span>
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-mono text-white">{myParticipant?.score || 0}</span>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex flex-col items-center w-1/3">
                    <span className={`text-2xl font-black ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {timeLeft}s
                    </span>
                    <Progress value={progress} className={`h-2 w-full ${timeLeft < 5 ? 'bg-red-900' : 'bg-slate-800'}`} indicatorClassName={timeLeft < 5 ? 'bg-red-500' : 'bg-cyan-500'} />
                </div>

                {/* Host */}
                {isHost && (
                    <Button size="sm" variant="ghost" onClick={triggerNextQuestion} disabled={phase !== 'IDLE'}>
                        {phase === 'IDLE' ? 'Next Q' : 'Running...'}
                    </Button>
                )}
            </div>

            {/* Main Arena */}
            <div className="w-full max-w-7xl grid grid-cols-12 gap-6 mt-24 h-[calc(100vh-120px)]">

                {/* Left: Leaderboard / Teams */}
                <div className="col-span-3 space-y-4 overflow-auto hidden md:block">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h3 className="font-bold text-slate-400 mb-4 uppercase text-xs tracking-wider">Live Ranking</h3>
                        <div className="space-y-2">
                            {(participants || []).sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, i) => (
                                <div key={p.id} className={`flex items-center justify-between p-2 rounded ${p.user_id === user?.id ? 'bg-slate-800 border border-slate-700' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-500 w-4">{i + 1}</span>
                                        <StreakFire streak={p.current_streak || 0}>
                                            <span className="text-sm text-white truncate max-w-[100px]">{p.username}</span>
                                        </StreakFire>
                                    </div>
                                    <span className="font-mono text-emerald-400">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center: Boss & Question */}
                <div className="col-span-12 md:col-span-6 flex flex-col items-center justify-start gap-8 relative">

                    {/* Boss Unit (Always visible in Boss Mode) */}
                    <BossUnit
                        hp={lobby.boss_hp || 10000}
                        maxHp={lobby.boss_max_hp || 10000}
                        isAttacking={timeLeft % 5 === 0 && timeLeft > 0}
                    />

                    {/* Question Card */}
                    <div className="w-full flex justify-center relative z-20">
                        {phase === 'QUESTION' && currentQuestion && !hasAnswered ? (
                            <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 w-full flex justify-center">
                                <QuestionCard
                                    question={currentQuestion}
                                    onAnswer={handleAnswer}
                                    activeEffects={activeEffects}
                                    disabled={false}
                                />
                            </div>
                        ) : (
                            <div className="text-center space-y-4 min-h-[200px] flex flex-col items-center justify-center">
                                {phase === 'REVEAL' ? (
                                    <h2 className="text-4xl font-black text-white animate-bounce">
                                        {hasAnswered ? "LOCKED IN!" : "TIME'S UP!"}
                                    </h2>
                                ) : (
                                    <div className="text-slate-500 animate-pulse flex flex-col items-center">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        Waiting for next round...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Events / Chat (Placeholder) */}
                <div className="col-span-3 hidden md:block">
                    {/* Could put chat or event log here */}
                </div>

            </div>

            {/* Bottom: Power-Up Tray */}
            {myParticipant && (
                <PowerUpTray
                    inventory={myParticipant.inventory || []}
                    onUse={usePowerUp}
                    disabled={phase !== 'QUESTION' || hasAnswered}
                />
            )}

        </div>
    );
};

export default JamArena;
