import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Play, Users, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import GameBoard from './GameBoard';
import QuestionOverlay from './QuestionOverlay';

// Props: The lobby ID the user has joined
const ActiveRace = ({ lobbyId }: { lobbyId: string }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [lobby, setLobby] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [tiles, setTiles] = useState<any[]>([]); // Board tiles (reused)

    // Local state for the specific user in this round
    const [hasAnsweredRound, setHasAnsweredRound] = useState(false);
    const [roundResult, setRoundResult] = useState<{ msg: string, color: string } | null>(null);

    useEffect(() => {
        if (!lobbyId || !user) return;

        // Fetch initial lobby state
        const fetchLobby = async () => {
            const { data: lobbyData, error } = await supabase
                .from('game_lobbies')
                .select('*')
                .eq('id', lobbyId)
                .single();

            if (lobbyData) {
                setLobby(lobbyData);
                setIsHost(lobbyData.host_id === user.id);

                // Reset answer state if viewing a new question
                // Ideally we compare IDs but for now ensure we don't block
            }

            // Fetch participants
            const { data: parts } = await supabase
                .from('game_participants')
                .select('*')
                .eq('lobby_id', lobbyId);

            setParticipants(parts || []);

            // Fetch Tiles (Static Board)
            const { data: tileData } = await supabase.from('game_tiles').select('*, owner:owner_id(color)').order('position_index');
            setTiles(tileData || []);
        };

        fetchLobby();

        // Subscribe to updates
        const channel = supabase
            .channel(`lobby-${lobbyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_lobbies', filter: `id=eq.${lobbyId}` }, (payload) => {
                // Check if question changed
                if (payload.new.current_question_id !== lobby?.current_question_id) {
                    setHasAnsweredRound(false);
                    setRoundResult(null);
                }
                setLobby(payload.new);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_participants', filter: `lobby_id=eq.${lobbyId}` }, (payload) => {
                // Refresh list on any change
                // Optimised: just update the specific part in state? For MVP fetch all is safer for syncing
                supabase.from('game_participants').select('*').eq('lobby_id', lobbyId).then(({ data }) => {
                    if (data) setParticipants(data);
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [lobbyId, user, lobby?.current_question_id]);

    const copyLink = () => {
        navigator.clipboard.writeText(lobbyId);
        toast({ title: "Lobby ID Copied!", description: "Share this with friends." });
    };

    const nextRound = async () => {
        if (!isHost) return;

        // Pick random q
        const { data: qs } = await supabase.from('questions').select('id').eq('subtopic', 'Sentence Correction').limit(20);
        if (!qs || qs.length === 0) return;

        const randomQ = qs[Math.floor(Math.random() * qs.length)];

        await supabase.from('game_lobbies').update({
            status: 'PLAYING',
            current_question_id: randomQ.id,
            round_start_time: new Date().toISOString()
        }).eq('id', lobbyId);
    };

    const handleRaceMove = async ({ correct, timeMs }: { correct: boolean, timeMs: number }) => {
        setHasAnsweredRound(true);

        // Calculate steps
        let steps = 0;
        if (correct) {
            const sec = timeMs / 1000;
            if (sec < 3) steps = 6;
            else if (sec < 5) steps = 5;
            else if (sec < 8) steps = 4;
            else if (sec < 12) steps = 3;
            else steps = 2; // Min move for correct
            setRoundResult({ msg: `Correct! +${steps} Moves!`, color: 'text-emerald-400' });
        } else {
            steps = -3;
            setRoundResult({ msg: `Wrong! -3 Moves!`, color: 'text-red-500' });
        }

        // Update DB
        const myPart = participants.find(p => p.user_id === user?.id);
        if (myPart) {
            const newPos = Math.max(0, (myPart.position_index || 0) + steps);
            await supabase.from('game_participants').update({
                position_index: newPos,
                last_answer_time: timeMs
            }).eq('id', myPart.id);
        }

        // IF HOST: Auto-trigger next round after 5s?
        if (isHost) {
            setTimeout(() => {
                nextRound();
            }, 5000);
        }
    };

    if (!lobby) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;

    if (lobby.status === 'WAITING') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
                <Card className="p-8 bg-slate-900/80 backdrop-blur border-slate-700 w-full max-w-md text-center space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Waiting Room</h2>
                        <p className="text-slate-400">Laps: {lobby.settings?.laps || 5} • Difficulty: {lobby.settings?.difficulty || 'Intermediate'}</p>
                        <div className="flex items-center justify-center gap-2 bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-700 transition" onClick={copyLink}>
                            <code className="text-emerald-400 font-mono">{lobbyId}</code>
                            <LinkIcon className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {participants.map((p) => (
                            <div key={p.id} className="flex flex-col items-center gap-1">
                                <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`} className="w-12 h-12 rounded-full border-2 border-white/20" />
                                <span className="text-xs text-slate-300 truncate w-full">{p.username}</span>
                            </div>
                        ))}
                        {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, i) => (
                            <div key={i} className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                                <Users className="w-5 h-5 text-slate-700" />
                            </div>
                        ))}
                    </div>

                    {isHost ? (
                        <Button onClick={nextRound} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-6 text-lg">
                            <Play className="w-5 h-5 mr-2" /> Start Race
                        </Button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-500 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Waiting for host...
                        </div>
                    )}
                </Card>
            </div>
        );
    }

    // PLAYING STATE
    return (
        <div className="relative h-full w-full bg-slate-950 flex flex-col">
            {/* Race Header / Leaderboard strip */}
            <div className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center px-6 justify-between z-50">
                <h2 className="font-bold text-emerald-400">Lap {1}/{lobby.settings?.laps || 5}</h2>
                <div className="flex gap-4">
                    {/* Simple Top 3 */}
                    {participants.sort((a, b) => b.position_index - a.position_index).slice(0, 3).map((p, i) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-slate-500">#{i + 1}</span>
                            <span className="text-white">{p.username}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* THE BOARD (Reused) */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                <GameBoard
                    tiles={tiles}
                    players={participants.map(p => ({
                        id: p.id,
                        position_index: p.position_index % 40, // Loop 0-39
                        color: '#emerald-500',
                        avatar_url: p.avatar_url
                    }))}
                    currentPlayer={participants.find(p => p.user_id === user?.id)}
                />
            </div>

            {/* Question Modal Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
                {/* Show the Question Overlay if there is a question ID and user hasn't answered yet */}
                {lobby.current_question_id && !hasAnsweredRound && (
                    <div className="pointer-events-auto w-full h-full">
                        <QuestionOverlay
                            questionId={lobby.current_question_id}
                            onAnswer={handleRaceMove}
                        />
                    </div>
                )}

                {/* Feedback after answering */}
                {hasAnsweredRound && roundResult && (
                    <div className="absolute top-1/4 animate-in zoom-in slide-in-from-bottom-5 duration-300">
                        <div className={`px-8 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl`}>
                            <AlertCircle className={`w-6 h-6 ${roundResult.color.includes('red') ? 'text-red-500' : 'text-emerald-500'}`} />
                            <span className={`text-xl font-black ${roundResult.color}`}>{roundResult.msg}</span>
                            <span className="text-slate-500 text-xs ml-2 uppercase font-mono">Waiting for Next Round...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveRace;
