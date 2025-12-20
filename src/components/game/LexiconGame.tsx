import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Play, Users, Link as LinkIcon, Timer, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import LexiconBoard from './LexiconBoard';
import QuestionOverlay from './QuestionOverlay';
import GameLobby from './GameLobby';
import VocabSprintGame from './VocabSprintGame';

const LexiconGame = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // State
    const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
    const [lobby, setLobby] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [loading, setLoading] = useState(false);

    // Pulse/Round State
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // For Pulse
    const [hasAnsweredRound, setHasAnsweredRound] = useState(false);
    const [roundStatus, setRoundStatus] = useState<'IDLE' | 'ACTIVE' | 'COOLDOWN'>('IDLE');

    // --- Data Sync ---
    useEffect(() => {
        if (!activeLobbyId || !user) return;

        const fetchData = async () => {
            setLoading(true);
            const { data: l } = await supabase.from('game_lobbies').select('*').eq('id', activeLobbyId).single();
            if (l) {
                setLobby(l);
                setIsHost(l.host_id === user.id);
                if (l.status === 'PLAYING') {
                    calculateTimer(l.round_start_time);
                }
            }

            const { data: p } = await supabase.from('game_participants').select('*').eq('lobby_id', activeLobbyId);
            setParticipants(p || []);
            setLoading(false);
        };
        fetchData();

        // Realtime
        const channel = supabase.channel(`lexicon-${activeLobbyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_lobbies', filter: `id=eq.${activeLobbyId}` }, (payload) => {
                const newLobby = payload.new;
                setLobby(newLobby);

                // If question changed, reset local state
                if (newLobby.current_question_id !== lobby?.current_question_id) {
                    setHasAnsweredRound(false);
                    setRoundStatus('ACTIVE');
                    calculateTimer(newLobby.round_start_time);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_participants', filter: `lobby_id=eq.${activeLobbyId}` }, () => {
                supabase.from('game_participants').select('*').eq('lobby_id', activeLobbyId).then(({ data }) => {
                    if (data) setParticipants(data);
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeLobbyId, user]);

    // --- Timer Logic (Pulse) ---
    const calculateTimer = (startTimeISO: string) => {
        if (!startTimeISO) return;
        const start = new Date(startTimeISO).getTime();
        const duration = 15000; // 15s Pulse
        const end = start + duration;

        const now = Date.now();
        const diff = Math.ceil((end - now) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);

        if (diff > 0) setRoundStatus('ACTIVE');
        else setRoundStatus('COOLDOWN');
    };

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            if (roundStatus === 'ACTIVE') {
                setRoundStatus('COOLDOWN');
                // Auto-trigger next round if Host
                if (isHost) {
                    setTimeout(triggerPulse, 5000); // 5s Cooldown then Next
                }
            }
            return;
        }

        const timer = setInterval(() => setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, roundStatus, isHost]);

    // --- Host Actions ---
    const triggerPulse = async () => {
        if (!isHost) return;

        console.log("Triggering Pulse...");

        // 1. Pick Q
        // Fallback to ANY question if Sentence Correction is missing
        let { data: qs } = await supabase.from('questions').select('id').eq('subtopic', 'Sentence Correction').limit(50);

        if (!qs || qs.length === 0) {
            console.warn("No Sentence Correction questions found, trying fallback...");
            const { data: fallbackQs } = await supabase.from('questions').select('id').limit(50);
            qs = fallbackQs;
        }

        if (!qs || !qs.length) {
            toast({
                title: "No Questions Found!",
                description: "Please run the ETL script to populate questions.",
                variant: "destructive"
            });
            return;
        }

        const randomQ = qs[Math.floor(Math.random() * qs.length)];
        console.log("Selected Question:", randomQ.id);

        // 2. Update Lobby (Triggers Broadcast)
        const { error } = await supabase.from('game_lobbies').update({
            status: 'PLAYING',
            current_question_id: randomQ.id,
            round_start_time: new Date().toISOString()
        }).eq('id', activeLobbyId);

        if (error) {
            console.error("Error updating lobby:", error);
            toast({ title: "Game Loop Error", description: "Failed to update lobby state.", variant: "destructive" });
        }
    };

    // --- Player Actions ---
    const handleAnswer = async ({ correct, timeMs }: { correct: boolean, timeMs: number }) => {
        setHasAnsweredRound(true);
        if (!user || !activeLobbyId) return;

        let move = 0;
        let effectMessage = "";

        if (correct) {
            move = (timeMs < 4000) ? 4 : 2;
        } else {
            move = -1;
        }

        const myPart = participants.find(p => p.user_id === user.id);
        if (myPart) {
            let newPos = Math.max(0, Math.min(50, (myPart.position_index || 0) + move));

            // --- HIDDEN SECRETS (Chance) ---
            // 20% chance of a random effect when landing
            if (Math.random() < 0.2) {
                const effects = [
                    { name: "Admit Card Lost", move: -2, icon: "😱" },
                    { name: "Found Old Notes", move: +3, icon: "📜" },
                    { name: "Traffic Jam", move: 0, icon: "🚦" }, // No extra move
                    { name: "Coffee Boost", move: +1, icon: "☕" }
                ];
                const effect = effects[Math.floor(Math.random() * effects.length)];
                newPos += effect.move;
                effectMessage = `${effect.icon} ${effect.name} (${effect.move > 0 ? '+' : ''}${effect.move})`;

                toast({
                    title: "Hidden Secret Found!",
                    description: effectMessage,
                    className: "bg-purple-900 border-purple-500 text-white"
                });
            }

            // Check Special Tiles (Fixed)
            if ([10, 20, 30].includes(newPos)) {
                newPos += 5;
                toast({ title: "Ladder!", description: "Skipped ahead 5 tiles! 🪜", className: "bg-blue-600 text-white" });
            }

            await supabase.from('game_participants').update({
                position_index: newPos,
                last_answer_time: timeMs
            }).eq('id', myPart.id);
        }
    };

    // --- Render ---

    // 1. Not in Lobby
    if (!activeLobbyId) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <GameLobby onJoin={setActiveLobbyId} />
            </div>
        );
    }

    // 2. Loading
    if (loading || !lobby) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            </div>
        );
    }

    // 3. In Lobby (Waiting)
    if (lobby?.status === 'WAITING') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <div className="text-center space-y-4 mb-8">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        {lobby.game_mode === 'SPRINT' ? 'VocabSprint ⚡' : 'LexiconPoly 🎲'}
                    </h1>
                    <h2 className="text-2xl text-white">Lobby: {lobby.code || activeLobbyId.slice(0, 6)}</h2>
                    <p className="text-slate-400">{participants.length} Racers Ready</p>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    {participants.map(p => (
                        <div key={p.id} className="w-16 h-16 rounded-full border border-slate-700 overflow-hidden relative">
                            <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`} />
                            {p.team_name && (
                                <div className={`absolute bottom-0 w-full h-2 ${p.team_name === 'Red' ? 'bg-red-500' :
                                        p.team_name === 'Blue' ? 'bg-blue-500' :
                                            p.team_name === 'Green' ? 'bg-emerald-500' : 'bg-purple-500'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {isHost ? (
                    <Button onClick={triggerPulse} className="px-8 py-6 text-xl font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">
                        START GAME 🚀
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                        <Loader2 className="animate-spin" /> Waiting for Host...
                    </div>
                )}
            </div>
        );
    }

    // 4. Playing - ROUTER
    if (lobby.game_mode === 'SPRINT') {
        return <VocabSprintGame lobbyId={activeLobbyId} lobby={lobby} participants={participants} isHost={isHost} />;
    }

    // 5. Playing - BOARD (Default)
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center relative overflow-hidden">
            {/* Header UI */}
            <div className="w-full h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 z-40 fixed top-0">
                <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-400 tracking-wider">LEXICON SPRINT</span>
                </div>

                {/* Timer Pulse */}
                <div className={`flex items-center gap-2 font-mono font-bold text-2xl ${timeLeft && timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    <Timer className="w-5 h-5" />
                    {timeLeft || 0}s
                    {roundStatus === 'COOLDOWN' && <span className="text-sm text-slate-400 ml-2">(Next Round in 5s...)</span>}
                </div>

                {/* Host Controls */}
                {isHost && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={roundStatus === 'IDLE' ? "default" : "secondary"}
                            onClick={triggerPulse}
                            disabled={roundStatus === 'ACTIVE'}
                        >
                            {roundStatus === 'ACTIVE' ? 'Round in Progress' : 'Force Next Round ⏭️'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Board */}
            <div className="w-full h-full pt-20 pb-4 overflow-auto">
                <LexiconBoard
                    players={participants}
                    currentPlayer={participants.find(p => p.user_id === user?.id)}
                />
            </div>

            {/* Question Overlay (The Pulse) */}
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
                {lobby.current_question_id && !hasAnsweredRound && timeLeft && timeLeft > 0 && (
                    <div className="pointer-events-auto">
                        <QuestionOverlay
                            questionId={lobby.current_question_id}
                            onAnswer={handleAnswer}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LexiconGame;
