"use client";

import { toast } from "sonner";
import { Zap, Trophy, Star, Target, TrendingUp, Award, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type AchievementType = 'points' | 'streak' | 'level' | 'perfect' | 'bonus' | 'penalty';

interface PointToastProps {
    amount: number;
    reason: string;
    type?: AchievementType;
    description?: string;
}

export const showPointToast = ({ amount, reason, type = 'points', description }: PointToastProps) => {
    const isPositive = amount > 0;

    // Select icon and color based on type
    let Icon = Zap;
    let bgColor = "bg-primary";
    let iconColor = "text-primary";
    let borderColor = "border-primary/20";

    switch (type) {
        case 'perfect':
            Icon = Trophy;
            bgColor = "bg-yellow-500";
            iconColor = "text-yellow-500";
            borderColor = "border-yellow-500/20";
            break;
        case 'streak':
            Icon = Flame;
            bgColor = "bg-orange-500";
            iconColor = "text-orange-500";
            borderColor = "border-orange-500/20";
            break;
        case 'level':
            Icon = Award;
            bgColor = "bg-purple-500";
            iconColor = "text-purple-500";
            borderColor = "border-purple-500/20";
            break;
        case 'bonus':
            Icon = Star;
            bgColor = "bg-green-500";
            iconColor = "text-green-500";
            borderColor = "border-green-500/20";
            break;
        case 'penalty':
            Icon = Target;
            bgColor = "bg-red-500";
            iconColor = "text-red-500";
            borderColor = "border-red-500/20";
            break;
    }

    toast.custom((id) => (
        <div className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border shadow-xl transition-all duration-500 bg-background/95 backdrop-blur-md min-w-[300px] max-w-[420px]",
            borderColor,
            "animate-in slide-in-from-right-full"
        )}>
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative group",
                bgColor + "/10"
            )}>
                <div className={cn("absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity", bgColor)} />
                <Icon className={cn("w-6 h-6 relative z-10", iconColor)} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={cn(
                        "text-lg font-black italic tracking-tighter whitespace-nowrap shrink-0",
                        isPositive ? "text-green-500" : "text-red-500"
                    )}>
                        {isPositive ? "+" : ""}{amount} VP
                    </h4>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30 shrink-0">•</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">{reason}</span>
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground font-medium truncate">
                        {description}
                    </p>
                )}
            </div>

            <button
                onClick={() => toast.dismiss(id)}
                className="p-1 hover:bg-muted rounded-full transition-colors self-start"
            >
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </button>
        </div>
    ), {
        duration: 3000,
        position: 'bottom-right'
    });
};
