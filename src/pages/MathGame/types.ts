export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
    x: number;
    y: number;
}

export interface PlayerState {
    position: Position;
    direction: Direction;
    isMoving: boolean;
}

export interface GameMap {
    id: string;
    width: number;
    height: number;
    tiles: number[][]; // 0: Grass, 1: Path, 2: Wall, 3: Water
    events: GameEvent[];
}

export interface GameEvent {
    id: string;
    position: Position;
    type: 'NPC' | 'WARP' | 'ITEM';
    trigger: 'ACTION' | 'STEP';
    data?: any;
}

export type GameMode = 'MAP' | 'BATTLE' | 'DIALOG' | 'MENU' | 'INPUT';

export interface QuestState {
    hasTracker: boolean;
    cluesFound: {
        student: boolean;
        clerk: boolean;
        oldMan: boolean;
    };
    fogCleared: boolean;
    gymUnlocked: boolean;
}

export interface Pokemon {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    stats: {
        attack: number;
        defense: number;
        speed: number;
        recovery: number;
    };
    element: 'fire' | 'water' | 'plant' | 'normal';
    energy: number;
    maxEnergy: number;
    abilities: string[]; // Names of attacks
    spriteFront: string;
    spriteBack: string;
}

export interface BattleState {
    playerPokemon: Pokemon;
    enemyPokemon: Pokemon;
    turn: 'PLAYER' | 'ENEMY';
    message: string;
    phase: 'INTRO' | 'MENU' | 'QUESTION' | 'ATTACK' | 'RESULT';
    currentQuestion?: {
        text: string;
        answer: string;
    };
    selectedAttack?: string; // Track which attack was chosen
}
