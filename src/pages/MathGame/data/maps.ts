import { GameMap } from '../types';

// Map Dimensions: 50x40
// Map Dimensions: 50x40
const WIDTH = 50;
const HEIGHT = 40;

console.log("Map Data Loaded: " + Date.now());

// Tile IDs (Derived from Debug Screenshot)
const GRASS = 0; // Default guess
const TREE = 160; // Dense tree block (Guess)
const PATH = 25; // Sand/Yellow path (Guess)
const WATER = 48; // Water (Guess)
const FENCE = 72;
const FLOWER = 16;

// Building Tiles (REAL IDs from Screenshot)
// Red Roof (PC)
const ROOF_PC_TL = 1584;
const ROOF_PC_TR = 1587;
const ROOF_PC_BL = 1634;
const ROOF_PC_BR = 1637;

// Blue Roof (Mart)
const ROOF_MART_TL = 1628;
const ROOF_MART_TR = 1631;

// Green Roof (House)
const ROOF_HOUSE_TL = 1976;
const ROOF_HOUSE_TR = 1979;

// Walls
const WALL_WHITE = 1684;
const WALL_ORANGE = 1834;

const WINDOW = 1685; // White wall with window
const DOOR = 1779; // Purple door

// Helper to create empty map
const createMap = (w: number, h: number, fill: number) => {
    return Array(h).fill(null).map(() => Array(w).fill(fill));
};

const tiles = createMap(WIDTH, HEIGHT, GRASS);

// --- Draw Map Features ---

// 1. Borders (Trees)
for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        if (x < 2 || x > WIDTH - 3 || y < 2 || y > HEIGHT - 3) {
            tiles[y][x] = TREE;
        }
    }
}

// 2. Paths (Yellow/Sand)
// Main Horizontal Road
for (let x = 2; x < WIDTH - 2; x++) {
    tiles[15][x] = PATH;
    tiles[16][x] = PATH;
    tiles[25][x] = PATH; // Lower road
    tiles[26][x] = PATH;
}

// Vertical Connections
for (let y = 2; y < HEIGHT - 2; y++) {
    tiles[y][12] = PATH; // Left vertical
    tiles[y][13] = PATH;

    tiles[y][28] = PATH; // Right vertical
    tiles[y][29] = PATH;
}

// 3. Buildings

// Helper to place simple rectangular building
const placeBuilding = (tx: number, ty: number, w: number, h: number, roofStart: number, wallTile: number, doorX: number) => {
    // Roof (Simple loop, assuming sequential IDs for now, but we might need more complex logic later)
    // For now, just fill with the top-left roof tile to show *something* valid
    for (let y = ty; y < ty + h - 2; y++) {
        for (let x = tx; x < tx + w; x++) {
            tiles[y][x] = roofStart + (x - tx) + (y - ty) * 8; // Attempt to map 8-width grid
        }
    }
    // Walls
    for (let y = ty + h - 2; y < ty + h; y++) {
        for (let x = tx; x < tx + w; x++) {
            tiles[y][x] = wallTile;
        }
    }
    // Door
    tiles[ty + h - 1][tx + doorX] = DOOR;
    // Windows
    if (w > 3) {
        tiles[ty + h - 2][tx + 1] = WINDOW;
        tiles[ty + h - 2][tx + w - 2] = WINDOW;
    }
};

// Pokemon Center (Red Roof) - Top Left
placeBuilding(8, 6, 4, 4, ROOF_PC_TL, WALL_WHITE, 2);

// Poke Mart (Blue Roof) - Next to PC
placeBuilding(14, 6, 4, 4, ROOF_MART_TL, WALL_WHITE, 2);

// Gym (Large, Orange/Red) - Far Right
placeBuilding(35, 10, 6, 5, ROOF_PC_TL, WALL_ORANGE, 3);

// House 1 (Green) - Top Right
placeBuilding(32, 6, 4, 4, ROOF_HOUSE_TL, WALL_WHITE, 1);

// House 2 (Green) - Bottom Right
placeBuilding(32, 28, 4, 4, ROOF_HOUSE_TL, WALL_WHITE, 1);

// House 3 (Green) - Bottom Left
placeBuilding(8, 28, 4, 4, ROOF_HOUSE_TL, WALL_WHITE, 1);

// Counting House (Central)
placeBuilding(18, 18, 6, 5, ROOF_MART_TL, WALL_ORANGE, 3);

// 4. Details
// Fences
for (let y = 6; y < 12; y++) {
    tiles[y][6] = FENCE; // Fence near PC
}

// Flowers
tiles[18][10] = FLOWER;
tiles[18][11] = FLOWER;
tiles[19][10] = FLOWER;
tiles[19][11] = FLOWER;


export const INITIAL_MAP: GameMap = {
    id: 'numbers_town',
    width: WIDTH,
    height: HEIGHT,
    tiles: tiles,
    events: [
        // --- Storyline NPCs ---

        // Professor Logic (Near Counting House)
        {
            id: 'prof_logic',
            position: { x: 21, y: 24 }, // In front of Counting House
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Professor Logic',
                sprite: '/assets/math-rpg/characters/blond.png',
                dialog: [
                    "Welcome to Numbers Town!",
                    "We are in a state of Statistical Chaos.",
                    "The Logic Fog has jammed the Prime Regulator.",
                    "Here, take this Variable Tracker.",
                    "Interview the residents to find the missing data points."
                ],
                questUpdate: 'START'
            }
        },
        // Student (Bottom Left House)
        {
            id: 'student',
            position: { x: 10, y: 33 },
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Student',
                sprite: '/assets/math-rpg/characters/young_guy.png',
                dialog: [
                    "I can't finish my homework!",
                    "My records are incomplete...",
                    "The average temperature for Wednesday, Thursday, and Friday was 40°C."
                ],
                questUpdate: 'CLUE_STUDENT'
            }
        },
        // Clerk (Poke Mart)
        {
            id: 'clerk',
            position: { x: 16, y: 11 },
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Clerk',
                sprite: '/assets/math-rpg/characters/hat_girl.png',
                dialog: [
                    "The warehouse readings are weird.",
                    "The system says the average for Thursday, Friday, and Saturday was 41°C."
                ],
                questUpdate: 'CLUE_CLERK'
            }
        },
        // Old Man (Near Gym)
        {
            id: 'old_man',
            position: { x: 39, y: 17 },
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Old Man',
                sprite: '/assets/math-rpg/characters/straw.png',
                dialog: [
                    "It was so hot before the fog rolled in!",
                    "I checked the thermometer myself...",
                    "Saturday was a scorching 42°C!"
                ],
                questUpdate: 'CLUE_OLDMAN'
            }
        },
        // Fountain/Regulator (Central Plaza)
        {
            id: 'fountain',
            position: { x: 21, y: 16 }, // Center of map
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Prime Regulator',
                sprite: '', // No sprite for now, hidden collision or basic rock
                dialog: [
                    "The Prime Regulator is humming...",
                    "ENTER THE TRUE VARIABLE FOR WEDNESDAY."
                ],
                isPuzzle: true
            }
        },
        // Gym Door
        {
            id: 'gym_door',
            position: { x: 39, y: 15 },
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Gym Door',
                sprite: '',
                dialog: [
                    "The door is locked.",
                    "A sign reads: 'Gym Closed due to Logic Fog.'"
                ],
                checkGymLock: true
            }
        },

        // --- Flavor NPCs ---
        {
            id: 'town_guide',
            position: { x: 12, y: 18 },
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Town Guide',
                sprite: '/assets/math-rpg/characters/young_girl.png',
                dialog: ["Numbers Town is known for its precision.", "Don't step on the grass if you don't want to calculate!"]
            }
        },
        {
            id: 'kid_1',
            position: { x: 32, y: 33 },
            type: 'NPC',
            trigger: 'ACTION',
            data: {
                name: 'Kid',
                sprite: '/assets/math-rpg/characters/young_guy.png',
                dialog: ["My Pidgey has higher Speed stats than yours!"]
            }
        }
    ]
};
