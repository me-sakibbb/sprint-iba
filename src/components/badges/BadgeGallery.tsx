// ============================================
// BadgeGallery Component
// Displays all 12 badges with locked/unlocked states
// ============================================

import { LEVELS, type LevelDefinition } from '@/config/levels';
import LevelBadge from './LevelBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface BadgeGalleryProps {
    currentLevelId: number;
    className?: string;
}

export default function BadgeGallery({ currentLevelId, className }: BadgeGalleryProps) {
    // Group levels by track
    const warmUpLevels = LEVELS.filter(l => l.track === 'WARM_UP');
    const pickingUpLevels = LEVELS.filter(l => l.track === 'PICKING_UP_PACE');
    const fastLaneLevels = LEVELS.filter(l => l.track === 'FAST_LANE');
    const podiumLevels = LEVELS.filter(l => l.track === 'PODIUM');

    const renderTrackSection = (title: string, levels: LevelDefinition[], trackColor: string) => (
        <div className="space-y-4">
            <h3
                className="text-lg font-bold"
                style={{ color: trackColor }}
            >
                {title}
            </h3>
            <div className="grid grid-cols-3 gap-4">
                {levels.map((level) => {
                    const isUnlocked = currentLevelId >= level.id;
                    return (
                        <div
                            key={level.id}
                            className="relative flex flex-col items-center p-4 rounded-lg border border-border/40 transition-all duration-300 hover:shadow-lg"
                            style={{
                                background: isUnlocked
                                    ? `linear-gradient(135deg, ${trackColor}10 0%, transparent 100%)`
                                    : 'transparent',
                            }}
                        >
                            <LevelBadge level={level} size="lg" locked={!isUnlocked} />
                            <p className="text-sm font-semibold mt-2 text-center">{level.name}</p>
                            {!isUnlocked && (
                                <div className="absolute top-2 right-2">
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Badge Collection</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Unlock badges by reaching new levels. You've unlocked {currentLevelId} of 12 badges!
                </p>
            </CardHeader>
            <CardContent className="space-y-8">
                {renderTrackSection('Track 1: The Warm-Up', warmUpLevels, '#cd7f32')}
                {renderTrackSection('Track 2: Picking Up Pace', pickingUpLevels, '#4169e1')}
                {renderTrackSection('Track 3: The Fast Lane', fastLaneLevels, '#ffd700')}
                {renderTrackSection('Track 4: The Podium Finish', podiumLevels, '#9d00ff')}
            </CardContent>
        </Card>
    );
}
