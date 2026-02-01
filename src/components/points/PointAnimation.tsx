// ============================================
// Point Animation Component
// Displays VP gain/loss animations in header
// ============================================

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Zap } from 'lucide-react';

export interface PointAnimationData {
    amount: number;
    reason: string;
    timestamp: number;
}

interface PointAnimationProps {
    animations: PointAnimationData[];
    onComplete: (timestamp: number) => void;
}

export const PointAnimation: React.FC<PointAnimationProps> = ({ animations, onComplete }) => {
    const [visible, setVisible] = useState<PointAnimationData[]>([]);

    useEffect(() => {
        // Add new animations to visible list
        const newAnimations = animations.filter(
            (anim) => !visible.some((v) => v.timestamp === anim.timestamp)
        );

        if (newAnimations.length > 0) {
            setVisible([...visible, ...newAnimations]);
        }
    }, [animations]);

    const handleAnimationComplete = (timestamp: number) => {
        setVisible((prev) => prev.filter((v) => v.timestamp !== timestamp));
        onComplete(timestamp);
    };

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {visible.map((anim, index) => {
                    const isPositive = anim.amount > 0;
                    const isStreakBonus = anim.reason.includes('streak');

                    return (
                        <motion.div
                            key={anim.timestamp}
                            initial={{ opacity: 0, y: 0, scale: 0.8 }}
                            animate={{
                                opacity: [0, 1, 1, 0],
                                y: [0, -15, -30, -50],
                                scale: [0.8, 1.1, 1, 0.9],
                            }}
                            transition={{
                                duration: 2,
                                times: [0, 0.2, 0.7, 1],
                                ease: 'easeOut',
                            }}
                            onAnimationComplete={() => handleAnimationComplete(anim.timestamp)}
                            className="mb-2"
                            style={{
                                marginTop: `${index * 50}px`, // Stack animations
                            }}
                        >
                            <div
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full
                                    shadow-lg backdrop-blur-sm
                                    font-bold text-lg
                                    ${isPositive
                                        ? 'bg-green-500/90 text-white'
                                        : 'bg-red-500/90 text-white'
                                    }
                                    ${isStreakBonus ? 'ring-2 ring-orange-400' : ''}
                                `}
                            >
                                {isStreakBonus && (
                                    <Zap className="w-5 h-5 text-orange-300 fill-orange-300 animate-pulse" />
                                )}

                                {isPositive ? (
                                    <ArrowUp className="w-5 h-5" />
                                ) : (
                                    <ArrowDown className="w-5 h-5" />
                                )}

                                <span>
                                    {isPositive ? '+' : ''}
                                    {anim.amount} VP
                                </span>

                                {isStreakBonus && (
                                    <span className="text-xs px-2 py-0.5 bg-orange-400/30 rounded-full">
                                        Streak Bonus!
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default PointAnimation;
