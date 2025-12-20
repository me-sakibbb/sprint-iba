import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface GameBoardProps {
    tiles: any[];
    players: any[];
    currentPlayer: any;
}

const GameBoard: React.FC<GameBoardProps> = ({ tiles, players, currentPlayer }) => {
    // Generate default tiles if empty (for visual testing before DB populate)
    const displayTiles = tiles.length > 0 ? tiles : Array.from({ length: 40 }).map((_, i) => ({
        id: `tile-${i}`,
        position_index: i,
        name: i === 0 ? "GO" : i === 10 ? "JAIL" : `Plot ${i}`,
        type: "PROPERTY",
        rent_value: 50
    }));

    // Helper to place tiles in a loop (Monopoly style)
    // Top: 0-10, Right: 11-20, Bottom: 21-30, Left: 31-39
    // We'll arrange them in a CSS Grid or absolute positions for the isometric look.

    // Simplified Logic: Render as a large square loop
    const sideLength = 11;

    const getTilePosition = (index: number) => {
        // 0 = Bottom Right (GO)
        // 0-10 = Bottom Row (Left to Right? No, usually Go is corner. Let's say Go is Bottom Right).
        // Let's go Clockwise: Bottom-Right -> Bottom-Left -> Top-Left -> Top-Right
        // 0 .. 10 (Bottom Row, Right to Left)
        // 11 .. 20 (Left Col, Bottom to Top)
        // 21 .. 30 (Top Row, Left to Right)
        // 31 .. 39 (Right Col, Top to Bottom)

        // Grid Coordinates (0,0 is Top Left)
        // Let's assume a 12x12 grid to account for corners

        if (index >= 0 && index <= 10) return { row: 11, col: 11 - index };
        if (index >= 11 && index <= 20) return { row: 11 - (index - 10), col: 0 };
        if (index >= 21 && index <= 30) return { row: 0, col: index - 20 };
        if (index >= 31 && index <= 39) return { row: index - 30, col: 11 };

        return { row: 0, col: 0 };
    };

    return (
        <div className="relative w-[1200px] h-[1200px] transform scale-75 lg:scale-100 transition-transform select-none">
            {/* The Board Container */}
            <div className="absolute inset-0 bg-slate-900/50 rounded-3xl border-4 border-slate-700 shadow-2xl backdrop-blur-sm">
                {/* Center Hub */}
                <div className="absolute inset-0 m-auto w-[600px] h-[400px] flex flex-col items-center justify-center">
                    <div className="text-6xl font-black text-slate-800 tracking-tighter uppercase select-none opacity-50">
                        Vocab
                        <span className="text-slate-700">Poly</span>
                    </div>
                    <p className="text-slate-600 font-mono mt-4">The Road to IBA</p>
                </div>

                {/* Tiles */}
                {displayTiles.map((tile) => {
                    const { row, col } = getTilePosition(tile.position_index);
                    // Grid is 12x12. Cells are ~8% width/height.
                    const style = {
                        top: `${(row / 12) * 100}%`,
                        left: `${(col / 12) * 100}%`,
                        width: `${(1 / 12) * 100}%`,
                        height: `${(1 / 12) * 100}%`
                    };

                    const isCorner = tile.position_index % 10 === 0;

                    return (
                        <motion.div
                            key={tile.id}
                            className={cn(
                                "absolute flex flex-col items-center justify-center border border-slate-800/50 p-1 text-center group cursor-pointer transition-colors",
                                isCorner ? "bg-slate-800" : "bg-slate-900 hover:bg-slate-800"
                            )}
                            style={style}
                            whileHover={{ scale: 1.1, zIndex: 10 }}
                        >
                            {tile.owner && (
                                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: tile.owner.color || 'green' }} />
                            )}

                            <div className="text-[10px] font-bold text-slate-400 uppercase leading-tight truncate w-full px-1">
                                {tile.name}
                            </div>

                            {/* Players on this tile */}
                            <div className="flex -space-x-1 mt-1">
                                {players.filter(p => p.position_index === tile.position_index).map(p => (
                                    <div key={p.id} className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: p.color }} title={p.id}>
                                        {/* Avatar placeholder */}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default GameBoard;
