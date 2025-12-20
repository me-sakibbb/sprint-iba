import React from 'react';
import { Flame } from 'lucide-react';

interface StreakFireProps {
    streak: number;
    children: React.ReactNode;
}

const StreakFire: React.FC<StreakFireProps> = ({ streak, children }) => {
    if (streak < 3) return <>{children}</>;

    return (
        <div className="relative group">
            {/* Fire Animation Container */}
            <div className="absolute -inset-4 bg-gradient-to-t from-orange-600 via-red-500 to-yellow-400 rounded-full opacity-75 blur-lg group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

            {/* Particles (Simplified CSS) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                <Flame className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]" />
            </div>

            {/* Content */}
            <div className="relative">
                {children}
            </div>

            {/* Multiplier Badge */}
            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white text-xs font-black px-2 py-1 rounded-full border-2 border-yellow-400 shadow-lg rotate-12 z-10">
                2x PTS
            </div>
        </div>
    );
};

export default StreakFire;
