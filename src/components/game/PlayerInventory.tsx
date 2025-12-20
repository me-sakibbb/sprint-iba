import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Shield, Sword, AlertCircle, Loader2 } from 'lucide-react';

const PlayerInventory = ({ playerId }: { playerId: any }) => {
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!playerId) return;

        const fetchCards = async () => {
            // For MVP, we mock if DB cards table is empty or while we wait for schema
            // In real implementation:
            /*
            const { data } = await supabase
              .from('game_cards')
              .select('*, question:word_id(question_text, difficulty)')
              .eq('user_id', user.id); // Wait, playerId is game_player.id, we need user.id. 
            */

            // Let's just mock for UI visualization if fetch fails
            setCards([
                { id: 1, word: "Pragmatic", type: "Defense", power: 50 },
                { id: 2, word: "Benevolent", type: "Shield", power: 30 },
                { id: 3, word: "Obfuscate", type: "Attack", power: 80 },
                { id: 4, word: "Ephemeral", type: "Trap", power: 60 },
            ]);
            setLoading(false);
        };

        fetchCards();
    }, [playerId]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-400 font-bold text-xs uppercase tracking-wider">Card Deck</h2>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-500">{cards.length} / 10</span>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-3">
                    {cards.map((card) => (
                        <Card key={card.id} className="bg-slate-800/50 border-slate-700 p-3 hover:bg-slate-800 transition-colors cursor-pointer group">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-200">{card.word}</span>
                                <div className="flex items-center gap-1">
                                    {card.type === 'Attack' && <Sword className="w-3 h-3 text-red-400" />}
                                    {card.type === 'Defense' && <Shield className="w-3 h-3 text-blue-400" />}
                                    {card.type === 'Trap' && <AlertCircle className="w-3 h-3 text-yellow-400" />}
                                    <span className="text-xs font-mono text-slate-500">{card.power}</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-2">
                                Use to conquer tiles or defend your territory.
                            </div>
                        </Card>
                    ))}

                    {loading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-600" />}
                </div>
            </ScrollArea>
        </div>
    );
};

export default PlayerInventory;
