import React, { useEffect, useRef, useState } from 'react';
import { GameMap, Position, Direction } from '../types';

interface MapViewProps {
    map: GameMap;
    playerPos: Position;
    playerDir: Direction;
    isMoving: boolean;
}

const TILE_SIZE = 32;
const VIEWPORT_WIDTH = 15; // Tiles
const VIEWPORT_HEIGHT = 11; // Tiles
const SCALE = 2; // Zoom level

const DEBUG_IMAGES = false; // Toggle to view image status

const MapView: React.FC<MapViewProps> = ({ map, playerPos, playerDir, isMoving }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tilesetRef = useRef<HTMLImageElement>(new Image());
    const playerSpriteRef = useRef<HTMLImageElement>(new Image());

    // Cache for NPC sprites: { "spritePath": ImageObject }
    const npcSpritesRef = useRef<{ [key: string]: HTMLImageElement }>({});

    const [imagesLoaded, setImagesLoaded] = useState(false);

    // const [debugStatus, setDebugStatus] = useState<string[]>([]);

    useEffect(() => {
        // const log = (msg: string) => setDebugStatus(prev => [...prev, msg]);

        const checkLoaded = () => {
            if (tilesetRef.current.complete && playerSpriteRef.current.complete) {
                setImagesLoaded(true);
            }
        };

        tilesetRef.current.onload = () => {
            // log("Tileset Loaded"); 
            checkLoaded();
        };
        // tilesetRef.current.onerror = (e) => {
        //     log(`Tileset ERROR: ${tilesetRef.current.src}`);
        //     console.error("Tileset failed", e);
        // };

        playerSpriteRef.current.onload = () => {
            // log("Player Loaded");
            checkLoaded();
        };
        // playerSpriteRef.current.onerror = (e) => {
        //     log(`Player ERROR: ${playerSpriteRef.current.src}`);
        //     console.error("Player failed", e);
        // };

        tilesetRef.current.src = '/assets/math-rpg/tilesets/world.png';
        playerSpriteRef.current.src = '/assets/math-rpg/characters/player.png';

        // Preload NPC sprites
        map.events.forEach(event => {
            if (event.type === 'NPC' && event.data?.sprite) {
                const path = event.data.sprite;
                if (!npcSpritesRef.current[path]) {
                    const img = new Image();
                    img.onload = () => { /* log(`NPC ${path} Loaded`); */ };
                    img.onerror = () => log(`NPC Error: ${path}`);
                    img.src = path;
                    npcSpritesRef.current[path] = img;
                }
            }
        });

        if (tilesetRef.current.complete && playerSpriteRef.current.complete) {
            setImagesLoaded(true);
        }
    }, [map]); // Re-run if map changes (to load new NPCs)

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate camera position
        const camX = Math.max(0, Math.min(map.width - VIEWPORT_WIDTH, playerPos.x - Math.floor(VIEWPORT_WIDTH / 2)));
        const camY = Math.max(0, Math.min(map.height - VIEWPORT_HEIGHT, playerPos.y - Math.floor(VIEWPORT_HEIGHT / 2)));

        ctx.save();
        ctx.scale(SCALE, SCALE);

        // Draw Map
        for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
            for (let x = 0; x < VIEWPORT_WIDTH; x++) {
                const mapX = camX + x;
                const mapY = camY + y;

                if (mapX >= 0 && mapX < map.width && mapY >= 0 && mapY < map.height) {
                    const tileId = map.tiles[mapY][mapX];

                    // Always draw grass background first (Tile 0)
                    drawTile(ctx, 0, x * TILE_SIZE, y * TILE_SIZE);

                    if (tileId !== 0) {
                        drawTile(ctx, tileId, x * TILE_SIZE, y * TILE_SIZE);
                    }
                }
            }
        }

        // Draw NPCs
        map.events.forEach(event => {
            if (event.type === 'NPC') {
                const npcScreenX = (event.position.x - camX) * TILE_SIZE;
                const npcScreenY = (event.position.y - camY) * TILE_SIZE;

                if (npcScreenX >= -TILE_SIZE && npcScreenX < VIEWPORT_WIDTH * TILE_SIZE &&
                    npcScreenY >= -TILE_SIZE && npcScreenY < VIEWPORT_HEIGHT * TILE_SIZE) {

                    const spritePath = event.data?.sprite;
                    const spriteImg = spritePath ? npcSpritesRef.current[spritePath] : null;

                    if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                        drawCharacter(ctx, spriteImg, npcScreenX, npcScreenY, 'DOWN', false);
                    } else {
                        // Fallback to player sprite or red box
                        drawCharacter(ctx, playerSpriteRef.current, npcScreenX, npcScreenY, 'DOWN', false);
                    }
                }
            }
        });

        // Draw Player
        const playerScreenX = (playerPos.x - camX) * TILE_SIZE;
        const playerScreenY = (playerPos.y - camY) * TILE_SIZE;

        drawCharacter(ctx, playerSpriteRef.current, playerScreenX, playerScreenY, playerDir, isMoving);

        ctx.restore();

    }, [map, playerPos, playerDir, isMoving, imagesLoaded]);

    const drawTile = (ctx: CanvasRenderingContext2D, tileId: number, x: number, y: number) => {
        // Standard RPG Maker XP Tileset: 8 tiles wide (256px), 32x32 per tile
        const cols = 8;
        const srcX = (tileId % cols) * TILE_SIZE;
        const srcY = Math.floor(tileId / cols) * TILE_SIZE;

        if (tilesetRef.current.complete && tilesetRef.current.naturalWidth > 0) {
            ctx.drawImage(tilesetRef.current, srcX, srcY, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
        } else {
            // Fallback colors only if image fails
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
    };

    const drawCharacter = (
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        x: number,
        y: number,
        dir: Direction,
        moving: boolean
    ) => {
        const width = 32;
        const height = 48;

        let row = 0;
        switch (dir) {
            case 'DOWN': row = 0; break;
            case 'LEFT': row = 1; break;
            case 'RIGHT': row = 2; break;
            case 'UP': row = 3; break;
        }

        const col = moving ? (Math.floor(Date.now() / 200) % 4) : 0;

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(
                img,
                col * width, row * height, width, height,
                x, y - 16, width, height
            );
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
    };

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={VIEWPORT_WIDTH * TILE_SIZE * SCALE}
                height={VIEWPORT_HEIGHT * TILE_SIZE * SCALE}
                className="border-4 border-slate-700 rounded-lg shadow-2xl bg-black"
            />
            {/* Debug Removed */}
        </div>
    );
};

export default MapView;
