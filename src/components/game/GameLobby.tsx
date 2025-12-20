import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Trophy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GameLobbyProps {
    onJoin: (lobbyId: string) => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ onJoin }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [lobbyIdInput, setLobbyIdInput] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Host Settings
    const [gameMode, setGameMode] = useState<'POLY' | 'SPRINT'>('POLY');
    const [laps, setLaps] = useState('5');
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [duration, setDuration] = useState('300'); // 5 mins for Sprint

    const generateCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const createLobby = async () => {
        if (!user) return;
        setIsCreating(true);

        try {
            const code = generateCode();
            const settings = gameMode === 'POLY'
                ? { laps: parseInt(laps), difficulty }
                : { duration: parseInt(duration), difficulty }; // Sprint Settings

            const { data, error } = await supabase
                .from('game_lobbies')
                .insert({
                    host_id: user.id,
                    status: 'WAITING',
                    game_mode: gameMode,
                    settings: settings,
                    code: code
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-join host
            await joinLobby(data.id);

        } catch (err) {
            console.error(err);
            toast({ title: "Failed to create lobby", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const joinLobby = async (inputCode: string) => {
        if (!user) return;

        try {
            let targetLobbyId = inputCode;

            // If input is NOT a UUID (likely a short code), look it up
            if (!inputCode.includes('-')) {
                const { data, error } = await supabase
                    .from('game_lobbies')
                    .select('id')
                    .eq('code', inputCode.toUpperCase())
                    .single();

                if (error || !data) {
                    toast({ title: "Lobby not found", description: "Check the code and try again.", variant: "destructive" });
                    return;
                }
                targetLobbyId = data.id;
            }

            // Create participant record
            // Assign random team for Sprint if needed (or do it in lobby)
            const teams = ['Red', 'Blue', 'Green', 'Purple'];
            const randomTeam = teams[Math.floor(Math.random() * teams.length)];

            const { error } = await supabase
                .from('game_participants')
                .insert({
                    lobby_id: targetLobbyId,
                    user_id: user.id,
                    username: user.email?.split('@')[0] || 'Player',
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                    team_name: randomTeam // Auto-assign team
                });

            if (error) {
                if (error.code !== '23505') throw error; // Ignore duplicate
            }

            onJoin(targetLobbyId);

        } catch (err) {
            console.error(err);
            toast({ title: "Failed to join lobby", variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 p-4">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                    VocabRace
                </h1>
                <p className="text-slate-400">Race your friends through the campus!</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Create Column */}
                <Card className="p-6 bg-slate-900/50 border-slate-800 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Host a Race
                        </h2>
                        <p className="text-sm text-slate-400">Create a private lobby for your group.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Game Mode Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500">Game Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={gameMode === 'POLY' ? 'default' : 'outline'}
                                    onClick={() => setGameMode('POLY')}
                                    className="border-slate-700"
                                >
                                    VocabPoly 🎲
                                </Button>
                                <Button
                                    variant={gameMode === 'SPRINT' ? 'default' : 'outline'}
                                    onClick={() => setGameMode('SPRINT')}
                                    className="border-slate-700"
                                >
                                    VocabSprint ⚡
                                </Button>
                            </div>
                        </div>

                        {gameMode === 'POLY' ? (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-slate-500">Total Laps</label>
                                <Select value={laps} onValueChange={setLaps}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">3 Laps (Sprint)</SelectItem>
                                        <SelectItem value="5">5 Laps (Standard)</SelectItem>
                                        <SelectItem value="10">10 Laps (Marathon)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-slate-500">Duration</label>
                                <Select value={duration} onValueChange={setDuration}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="60">1 Minute (Blitz)</SelectItem>
                                        <SelectItem value="300">5 Minutes (Standard)</SelectItem>
                                        <SelectItem value="600">10 Minutes (Endurance)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500">Difficulty</label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Basic">Basic</SelectItem>
                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={createLobby} disabled={isCreating} className="w-full bg-emerald-600 hover:bg-emerald-500">
                            {isCreating ? "Creating..." : "Create Lobby"}
                        </Button>
                    </div>
                </Card>

                {/* Join Column */}
                <Card className="p-6 bg-slate-900/50 border-slate-800 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Join a Race
                        </h2>
                        <p className="text-sm text-slate-400">Enter a 6-character Lobby Code.</p>
                    </div>

                    <div className="space-y-4">
                        <Input
                            placeholder="e.g. X7A9B2"
                            value={lobbyIdInput}
                            onChange={(e) => setLobbyIdInput(e.target.value.toUpperCase())}
                            className="bg-slate-800 border-slate-700 font-mono uppercase"
                            maxLength={6}
                        />
                        <Button
                            onClick={() => joinLobby(lobbyIdInput)}
                            disabled={!lobbyIdInput || isCreating}
                            variant="secondary"
                            className="w-full"
                        >
                            Join Game
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default GameLobby;
