// ============================================
// Level Configuration for VP Gamification System
// ============================================

export type Track = 'WARM_UP' | 'PICKING_UP_PACE' | 'FAST_LANE' | 'PODIUM';

export interface LevelDefinition {
    id: number;
    name: string;
    description: string;
    vpThreshold: number;
    track: Track;
    trackColor: string;
    badgeImageUrl: string;
    color?: string; // Dynamic level color from DB
}

export interface UserLevel {
    id: string;
    userId: string;
    currentLevel: number;
    totalVp: number;
    lastLevelUpAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// All 12 level definitions
export const LEVELS: LevelDefinition[] = [
    // TRACK 1: The Warm-Up (Bronze/Green)
    {
        id: 1,
        name: 'The Rookie',
        description: "You've stepped onto the track. Time to lace up.",
        vpThreshold: 0,
        track: 'WARM_UP',
        trackColor: '#3dd5d1',
        badgeImageUrl: '/assets/badges/rookie.png'
    },
    {
        id: 2,
        name: 'The Stretcher',
        description: 'Warming up the mental muscles.',
        vpThreshold: 1500,
        track: 'WARM_UP',
        trackColor: '#14b8a6',
        badgeImageUrl: '/assets/badges/stretcher.png'
    },
    {
        id: 3,
        name: 'The Jogger',
        description: 'Finding a steady rhythm in your studies.',
        vpThreshold: 5000,
        track: 'WARM_UP',
        trackColor: '#0891b2',
        badgeImageUrl: '/assets/badges/jogger.png'
    },

    // TRACK 2: Picking Up Pace (Silver/Blue)
    {
        id: 4,
        name: 'The Pacer',
        description: 'You are hitting consistent targets. Keep this tempo!',
        vpThreshold: 15000,
        track: 'PICKING_UP_PACE',
        trackColor: '#c0c0c0',
        badgeImageUrl: '/assets/badges/pacer.png'
    },
    {
        id: 5,
        name: 'The Strider',
        description: 'Covering more ground with every session.',
        vpThreshold: 35000,
        track: 'PICKING_UP_PACE',
        trackColor: '#4169e1',
        badgeImageUrl: '/assets/badges/strider.svg'
    },
    {
        id: 6,
        name: 'The Hurdler',
        description: "Obstacles don't stop you; you jump right over them.",
        vpThreshold: 75000,
        track: 'PICKING_UP_PACE',
        trackColor: '#1e90ff',
        badgeImageUrl: '/assets/badges/hurdler.svg'
    },

    // TRACK 3: The Fast Lane (Gold/Orange/Red)
    {
        id: 7,
        name: 'The Sprinter',
        description: 'Full speed ahead. You are a serious contender.',
        vpThreshold: 150000,
        track: 'FAST_LANE',
        trackColor: '#ffd700',
        badgeImageUrl: '/assets/badges/sprinter.svg'
    },
    {
        id: 8,
        name: 'The Velocity Master',
        description: 'You are moving faster than the competition.',
        vpThreshold: 300000,
        track: 'FAST_LANE',
        trackColor: '#ff8c00',
        badgeImageUrl: '/assets/badges/velocity_master.svg'
    },
    {
        id: 9,
        name: 'The Mach 1',
        description: 'Breaking personal records every day. Supersonic mental speed.',
        vpThreshold: 550000,
        track: 'FAST_LANE',
        trackColor: '#ff4500',
        badgeImageUrl: '/assets/badges/mach1.png'
    },

    // TRACK 4: The Podium Finish (Platinum/Neon Purple/Diamond)
    {
        id: 10,
        name: 'The Olympian',
        description: 'You are in the top tier of aspirants. Elite performance.',
        vpThreshold: 1000000,
        track: 'PODIUM',
        trackColor: '#e5e4e2',
        badgeImageUrl: '/assets/badges/olympian.svg'
    },
    {
        id: 11,
        name: 'The Record Breaker',
        description: "You aren't just participating; you are redefining the standard.",
        vpThreshold: 2000000,
        track: 'PODIUM',
        trackColor: '#9d00ff',
        badgeImageUrl: '/assets/badges/record_breaker.svg'
    },
    {
        id: 12,
        name: 'The IBA Titan',
        description: 'The finish line is yours. You are ready to conquer the admission test.',
        vpThreshold: 4000000,
        track: 'PODIUM',
        trackColor: '#b9f2ff',
        badgeImageUrl: '/assets/badges/iba_titan.svg'
    }
];

// Track color schemes for UI theming
export const TRACK_THEMES = {
    WARM_UP: {
        primary: '#3dd5d1',
        secondary: '#14b8a6',
        accent: '#0891b2',
        gradient: 'linear-gradient(135deg, #3dd5d1 0%, #14b8a6 100%)',
        name: 'The Warm-Up'
    },
    PICKING_UP_PACE: {
        primary: '#c0c0c0',
        secondary: '#4169e1',
        accent: '#1e90ff',
        gradient: 'linear-gradient(135deg, #c0c0c0 0%, #1e90ff 100%)',
        name: 'Picking Up Pace'
    },
    FAST_LANE: {
        primary: '#ffd700',
        secondary: '#ff8c00',
        accent: '#ff4500',
        gradient: 'linear-gradient(135deg, #ffd700 0%, #ff4500 100%)',
        name: 'The Fast Lane'
    },
    PODIUM: {
        primary: '#e5e4e2',
        secondary: '#9d00ff',
        accent: '#b9f2ff',
        gradient: 'linear-gradient(135deg, #e5e4e2 0%, #9d00ff 50%, #b9f2ff 100%)',
        name: 'The Podium Finish'
    }
} as const;

/**
 * Get level definition by level ID
 */
export function getLevelById(levelId: number): LevelDefinition | undefined {
    return LEVELS.find(level => level.id === levelId);
}

/**
 * Calculate current level based on total VP
 */
export function calculateLevel(totalVp: number): LevelDefinition {
    // Iterate from highest to lowest to find the appropriate level
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalVp >= LEVELS[i].vpThreshold) {
            return LEVELS[i];
        }
    }
    // Default to level 1 if somehow no match (shouldn't happen)
    return LEVELS[0];
}

/**
 * Get the next level information
 */
export function getNextLevel(currentLevelId: number): LevelDefinition | null {
    const nextLevel = LEVELS.find(level => level.id === currentLevelId + 1);
    return nextLevel || null;
}

/**
 * Calculate progress percentage to next level
 */
export function calculateProgressToNextLevel(totalVp: number, currentLevelId: number): number {
    const currentLevel = getLevelById(currentLevelId);
    const nextLevel = getNextLevel(currentLevelId);

    if (!currentLevel || !nextLevel) {
        return 100; // Max level reached
    }

    const vpInCurrentLevel = totalVp - currentLevel.vpThreshold;
    const vpNeededForNextLevel = nextLevel.vpThreshold - currentLevel.vpThreshold;

    return Math.min(100, Math.max(0, (vpInCurrentLevel / vpNeededForNextLevel) * 100));
}

/**
 * Get VP remaining until next level
 */
export function getVpUntilNextLevel(totalVp: number, currentLevelId: number): number {
    const nextLevel = getNextLevel(currentLevelId);
    if (!nextLevel) {
        return 0; // Max level reached
    }
    return Math.max(0, nextLevel.vpThreshold - totalVp);
}

/**
 * Format VP number for display with commas
 */
export function formatVP(vp: number): string {
    return vp.toLocaleString('en-US');
}

/**
 * Get all levels for a specific track
 */
export function getLevelsByTrack(track: Track): LevelDefinition[] {
    return LEVELS.filter(level => level.track === track);
}

/**
 * Check if a user has unlocked a specific level
 */
export function hasUnlockedLevel(userLevelId: number, levelId: number): boolean {
    return userLevelId >= levelId;
}
