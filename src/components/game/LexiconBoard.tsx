import React from 'react';
import { motion } from 'framer-motion';

interface Player {
    id: string;
    position_index: number;
    color: string;
    avatar_url?: string;
    is_frozen?: boolean;
}

interface LexiconBoardProps {
    players: Player[];
    currentPlayer?: Player;
}

const LexiconBoard: React.FC<LexiconBoardProps> = ({ players, currentPlayer }) => {
    // Monopoly Layout: 40 Tiles (0-39)
    const TILE_SIZE = 70; // px
    const BOARD_SIZE = 700; // px

    const locations = [
        "IBA GATE", "Sobra Garden", "IBA Canteen", "SEIP", "Bunker-1", "DU Metro", "Modhur Canteen", "Shadow", "FBS Canteen", "Nilkhet",
        "IBA Exam hall", "Hostel Canteen", "Hostel Ground", "Common room", "TT Room", "Bunker-2", "Karwanbazar Metro", "Pagla Hotel", "Al- Amin Restaurant", "Hell",
        "Heaven", "Khao San", "Chillox", "Bokhari", "Beauty Lacchi", "Shahbagh Metro", "Bunker-3", "ODC", "Maowa Ghat", "Hostel bus",
        "Unannounced quiz", "Bashundhara", "Anondo Cinema hall", "RH Home center", "Bunker-4", "Farmgate Metro", "Hotel farmgate", "Dhanmondi", "Boom Boom Burger", "Mohammadpur"
    ];

    const getTileLabel = (i: number) => {
        return locations[i] || i.toString();
    };

    const tiles = Array.from({ length: 40 }, (_, i) => {
        let top = 0;
        let left = 0;
        let type = 'NORMAL';

        // 0 -> 10 (Bottom Right -> Bottom Left)
        if (i >= 0 && i <= 10) {
            top = BOARD_SIZE - TILE_SIZE;
            left = BOARD_SIZE - TILE_SIZE - (i * (BOARD_SIZE - TILE_SIZE) / 10);
        }
        // 11 -> 20 (Left Bottom -> Left Top)
        else if (i > 10 && i <= 20) {
            left = 0;
            top = BOARD_SIZE - TILE_SIZE - ((i - 10) * (BOARD_SIZE - TILE_SIZE) / 10);
        }
        // 21 -> 30 (Top Left -> Top Right)
        else if (i > 20 && i <= 30) {
            top = 0;
            left = (i - 20) * (BOARD_SIZE - TILE_SIZE) / 10;
        }
        // 31 -> 39 (Right Top -> Right Bottom)
        else {
            left = BOARD_SIZE - TILE_SIZE;
            top = (i - 30) * (BOARD_SIZE - TILE_SIZE) / 10;
        }

        if (i % 10 === 0) type = 'CORNER';

        return { id: i, top, left, label: getTileLabel(i), type };
    });

    return (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 p-8 overflow-hidden">
            <div
                className="relative bg-slate-900/50 border border-slate-800 shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-sm rounded-xl"
                style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
            >
                {/* Center Logo / Void */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950/50 to-slate-950"></div>
                    <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-cyan-500 tracking-tighter transform -rotate-45 filter blur-sm animate-pulse">
                        VOCAB<br />POLY
                    </h1>
                </div>

                {/* Tiles */}
                {tiles.map((tile) => (
                    <div
                        key={tile.id}
                        className={`absolute flex flex-col items-center justify-center border border-slate-800/80 backdrop-blur-md transition-all duration-300 hover:z-10 hover:scale-105 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]
                    ${tile.type === 'CORNER' ? 'bg-slate-800/90 z-10' : 'bg-slate-900/80'}
                    ${tile.id === 0 ? 'bg-emerald-900/30 border-emerald-500/50' : ''}
                `}
                        style={{
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                            top: tile.top,
                            left: tile.left,
                        }}
                    >
                        {/* Neon Color Bar for Properties */}
                        {tile.type === 'NORMAL' && (
                            <div className={`absolute w-full h-1 opacity-80 shadow-[0_0_8px_currentColor]
                        ${tile.id < 10 ? 'bottom-0 bg-cyan-500' : ''}
                        ${tile.id > 10 && tile.id < 20 ? 'left-0 h-full w-1 bg-fuchsia-500' : ''}
                        ${tile.id > 20 && tile.id < 30 ? 'top-0 w-full h-1 bg-orange-500' : ''}
                        ${tile.id > 30 ? 'right-0 h-full w-1 bg-emerald-500' : ''}
                    `} />
                        )}

                        <span className={`text-[9px] font-bold text-center leading-tight px-1 z-10 
                            ${tile.type === 'CORNER' ? 'text-emerald-400' : 'text-slate-400'}
                        `}>
                            {tile.label}
                        </span>

                        {tile.id === 0 && <span className="text-xl mt-1 animate-bounce">🚀</span>}
                        {tile.id === 10 && <span className="text-xl mt-1">🕸️</span>}
                    </div>
                ))}

                {/* Players */}
                {players.map((p) => {
                    const safeIndex = (p.position_index || 0) % 40;
                    const targetTile = tiles[safeIndex] || tiles[0];

                    return (
                        <motion.div
                            key={p.id}
                            initial={false}
                            animate={{ top: targetTile.top + 10, left: targetTile.left + 10 }}
                            transition={{ type: "spring", stiffness: 150, damping: 20 }}
                            className="absolute z-50"
                        >
                            <div className={`relative w-10 h-10 rounded-full border-2 shadow-[0_0_15px_rgba(255,255,255,0.3)] overflow-hidden bg-slate-950
                        ${p.id === currentPlayer?.id ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110' : 'border-slate-500'}
                    `}>
                                <img src={p.avatar_url} className="w-full h-full object-cover" />
                                {p.is_frozen && (
                                    <div className="absolute inset-0 bg-blue-500/60 flex items-center justify-center backdrop-blur-[1px]">
                                        ❄️
                                    </div>
                                )}
                            </div>
                            {/* Name Tag */}
                            {p.id === currentPlayer?.id && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[10px] px-2 py-0.5 rounded text-yellow-400 border border-yellow-500/30">
                                    YOU
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default LexiconBoard;
