// ============================================
// LevelBadge Component
// Displays user's current level badge with dynamic styling
// ============================================

import { type LevelDefinition, TRACK_THEMES } from '@/config/levels';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
    level: LevelDefinition;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showName?: boolean;
    className?: string;
    locked?: boolean;
}

const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-base',
    xl: 'w-32 h-32 text-lg',
};

export default function LevelBadge({
    level,
    size = 'md',
    showName = false,
    className,
    locked = false,
}: LevelBadgeProps) {
    const trackTheme = TRACK_THEMES[level.track];

    return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
            {/* Badge Container */}
            <div
                className={cn(
                    'relative flex items-center justify-center transition-all duration-300',
                    sizeClasses[size],
                    locked ? 'opacity-40 grayscale' : 'hover:scale-110'
                )}
            >
                {/* Badge Image/Icon */}
                <div className="relative w-full h-full flex items-center justify-center">
                    {level.badgeImageUrl && !locked ? (
                        <img
                            src={level.badgeImageUrl}
                            alt={level.name}
                            className="w-3/4 h-3/4 object-contain"
                            onError={(e) => {
                                // Fallback to level number if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}

                    {/* Fallback: Level Number */}
                    <span
                        className={cn(
                            'font-bold text-white',
                            level.badgeImageUrl && !locked ? 'hidden' : ''
                        )}
                    >
                        {locked ? '🔒' : level.id}
                    </span>
                </div>

                {/* Speed Lines for Fast Lane and Podium tracks */}
                {!locked && (level.track === 'FAST_LANE' || level.track === 'PODIUM') && (
                    <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute h-0.5 bg-white/30 animate-speed-line"
                                style={{
                                    top: `${30 + i * 20}%`,
                                    width: '60%',
                                    left: '-60%',
                                    animationDelay: `${i * 0.15}s`,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Glow effect for Podium track */}
                {!locked && level.track === 'PODIUM' && (
                    <div
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                            background: `radial-gradient(circle, ${trackTheme.accent}40 0%, transparent 70%)`,
                        }}
                    />
                )}
            </div>

            {/* Level Name */}
            {showName && (
                <div className="text-center">
                    <p className={cn('font-bold', locked ? 'text-muted-foreground' : 'gradient-text')}>
                        {level.name}
                    </p>
                    {!locked && (
                        <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                    )}
                </div>
            )}
        </div>
    );
}
