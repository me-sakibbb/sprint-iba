import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Droplets, CloudFog, Clock, Divide } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PowerUpTrayProps {
    inventory: string[];
    onUse: (item: string) => void;
    disabled: boolean;
}

const PowerUpTray: React.FC<PowerUpTrayProps> = ({ inventory, onUse, disabled }) => {
    const slots = [0, 1, 2]; // 3 Slots

    const getIcon = (item: string) => {
        switch (item) {
            case 'INK': return <Droplets className="w-6 h-6 text-slate-900" />;
            case 'FOG': return <CloudFog className="w-6 h-6 text-slate-400" />;
            case 'FREEZE': return <Clock className="w-6 h-6 text-cyan-400" />;
            case '5050': return <Divide className="w-6 h-6 text-yellow-400" />;
            default: return <Zap className="w-6 h-6 text-slate-600" />;
        }
    };

    const getLabel = (item: string) => {
        switch (item) {
            case 'INK': return "Ink Splat (Sabotage)";
            case 'FOG': return "Brain Fog (Sabotage)";
            case 'FREEZE': return "Time Freeze (Assist)";
            case '5050': return "50/50 Bomb (Assist)";
            default: return "Empty Slot";
        }
    };

    return (
        <div className="fixed bottom-4 right-4 bg-slate-900/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md z-50">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Power-Ups</h3>
            <div className="flex gap-2">
                <TooltipProvider>
                    {slots.map((slotIndex) => {
                        const item = inventory[slotIndex];
                        return (
                            <Tooltip key={slotIndex}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all ${item
                                                ? 'border-emerald-500 bg-emerald-950/30 hover:bg-emerald-900/50 hover:scale-105 cursor-pointer'
                                                : 'border-slate-800 bg-slate-950/50 border-dashed cursor-default'
                                            }`}
                                        onClick={() => item && !disabled && onUse(item)}
                                        disabled={!item || disabled}
                                    >
                                        {item ? getIcon(item) : <span className="text-slate-700 text-xs">EMPTY</span>}
                                    </Button>
                                </TooltipTrigger>
                                {item && (
                                    <TooltipContent>
                                        <p>{getLabel(item)}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>
        </div>
    );
};

export default PowerUpTray;
