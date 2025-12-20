import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Skull } from 'lucide-react';

interface BossUnitProps {
    hp: number;
    maxHp: number;
    isAttacking: boolean;
}

const BossUnit: React.FC<BossUnitProps> = ({ hp, maxHp, isAttacking }) => {
    const hpPercent = (hp / maxHp) * 100;

    return (
        <div className="flex flex-col items-center justify-center relative animate-in zoom-in duration-500">
            {/* Boss Avatar */}
            <div className={`w-48 h-48 bg-slate-900 rounded-full border-4 border-red-900 flex items-center justify-center relative shadow-[0_0_50px_rgba(220,38,38,0.5)] ${isAttacking ? 'animate-bounce' : 'animate-pulse'}`}>
                <Skull className="w-32 h-32 text-red-600" />

                {/* Eyes Glow */}
                <div className="absolute top-16 left-12 w-4 h-4 bg-red-500 rounded-full blur-sm animate-pulse" />
                <div className="absolute top-16 right-12 w-4 h-4 bg-red-500 rounded-full blur-sm animate-pulse" />
            </div>

            {/* Boss Name */}
            <h2 className="text-3xl font-black text-red-500 mt-4 tracking-widest uppercase drop-shadow-lg">
                The Ignorance Beast
            </h2>

            {/* HP Bar */}
            <div className="w-96 mt-4 relative">
                <div className="flex justify-between text-xs font-bold text-red-400 mb-1 uppercase">
                    <span>Boss HP</span>
                    <span>{hp} / {maxHp}</span>
                </div>
                <Progress value={hpPercent} className="h-6 bg-slate-900 border border-red-900" indicatorClassName="bg-gradient-to-r from-red-600 to-orange-600 transition-all duration-300" />
            </div>
        </div>
    );
};

export default BossUnit;
