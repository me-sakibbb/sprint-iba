import React, { useState, useEffect, useCallback } from 'react';
import { GameMap, PlayerState, Position, Direction, GameMode, BattleState, Pokemon, QuestState } from '../types';
import { INITIAL_MAP } from '../data/maps';
import MapView from './MapView';
import BattleView from './BattleView';
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { getRandomMathQuestion } from '../utils/questionManager';
import { MONSTERS } from '../data/monsters';
import { ATTACKS } from '../data/attacks';

const GameEngine = () => {
    const [mode, setMode] = useState<GameMode>('MAP');
    const [currentMap, setCurrentMap] = useState<GameMap>(INITIAL_MAP);
    const [player, setPlayer] = useState<PlayerState>({
        position: { x: 25, y: 35 }, // Start near south entrance
        direction: 'UP',
        isMoving: false
    });
    const [dialog, setDialog] = useState<string[] | null>(null);
    const [battleState, setBattleState] = useState<BattleState | null>(null);

    // Quest State
    const [questState, setQuestState] = useState<QuestState>({
        hasTracker: false,
        cluesFound: { student: false, clerk: false, oldMan: false },
        fogCleared: false,
        gymUnlocked: false
    });
    const [inputValue, setInputValue] = useState("");

    // startBattle removed (duplicate)

    const handleMove = useCallback((dir: Direction) => {
        if (mode !== 'MAP') return;

        setPlayer(prev => {
            const newPos = { ...prev.position };
            switch (dir) {
                case 'UP': newPos.y--; break;
                case 'DOWN': newPos.y++; break;
                case 'LEFT': newPos.x--; break;
                case 'RIGHT': newPos.x++; break;
            }

            // Collision Check
            if (
                newPos.x < 0 || newPos.x >= currentMap.width ||
                newPos.y < 0 || newPos.y >= currentMap.height ||
                currentMap.tiles[newPos.y][newPos.x] === 2 || // Wall
                currentMap.tiles[newPos.y][newPos.x] === 3    // Water
            ) {
                return { ...prev, direction: dir }; // Just turn
            }

            // Event Check (NPCs) - Block movement
            const event = currentMap.events.find(e => e.position.x === newPos.x && e.position.y === newPos.y);
            if (event && event.type === 'NPC') {
                return { ...prev, direction: dir };
            }

            // Check for Encounters (Grass = 0)
            const isGrass = currentMap.tiles[newPos.y][newPos.x] === 0;
            if (isGrass && Math.random() < 0.15) { // 15% chance
                // Trigger Battle after move completes
                setTimeout(() => startBattle(), 250);
            }

            return { ...prev, position: newPos, direction: dir, isMoving: true };
        });

        setTimeout(() => {
            setPlayer(prev => ({ ...prev, isMoving: false }));
        }, 200);

    }, [mode, currentMap]);

    const handleAction = () => {
        if (mode === 'DIALOG') {
            setMode('MAP');
            setDialog(null);
            return;
        }
        if (mode === 'INPUT') return;

        // Check for events in front of player
        const targetPos = { ...player.position };
        switch (player.direction) {
            case 'UP': targetPos.y--; break;
            case 'DOWN': targetPos.y++; break;
            case 'LEFT': targetPos.x--; break;
            case 'RIGHT': targetPos.x++; break;
        }

        const event = currentMap.events.find(e => e.position.x === targetPos.x && e.position.y === targetPos.y);
        if (event && event.trigger === 'ACTION') {
            if (event.type === 'NPC') {
                // Quest Logic
                if (event.data.questUpdate) {
                    const update = event.data.questUpdate;
                    if (update === 'START') {
                        setQuestState(prev => ({ ...prev, hasTracker: true }));
                    } else if (update === 'CLUE_STUDENT' && questState.hasTracker) {
                        setQuestState(prev => ({ ...prev, cluesFound: { ...prev.cluesFound, student: true } }));
                    } else if (update === 'CLUE_CLERK' && questState.hasTracker) {
                        setQuestState(prev => ({ ...prev, cluesFound: { ...prev.cluesFound, clerk: true } }));
                    } else if (update === 'CLUE_OLDMAN' && questState.hasTracker) {
                        setQuestState(prev => ({ ...prev, cluesFound: { ...prev.cluesFound, oldMan: true } }));
                    }
                }

                // Puzzle Logic
                if (event.data.isPuzzle) {
                    if (questState.fogCleared) {
                        setDialog(["The Prime Regulator is running smoothly."]);
                        setMode('DIALOG');
                    } else {
                        setDialog(event.data.dialog);
                        setMode('INPUT');
                        setInputValue("");
                    }
                    return;
                }

                // Gym Lock Logic
                if (event.data.checkGymLock) {
                    if (questState.gymUnlocked) {
                        setDialog(["The Gym is open! Good luck!"]);
                        setMode('DIALOG');
                    } else {
                        setDialog(event.data.dialog);
                        setMode('DIALOG');
                    }
                    return;
                }

                setDialog(event.data.dialog);
                setMode('DIALOG');
            }
        }
    };

    const handlePuzzleSubmit = () => {
        if (inputValue === "39") {
            setQuestState(prev => ({ ...prev, fogCleared: true, gymUnlocked: true }));
            setDialog(["CORRECT VARIABLE DETECTED.", "Logic Fog clearing...", "Gym Unlocked!"]);
            setMode('DIALOG');
        } else {
            setDialog(["INCORRECT VARIABLE.", "Calculation Error."]);
            setMode('DIALOG');
        }
    };

    // Battle Handlers
    const startBattle = () => {
        // Randomly select a player monster for now (or could be fixed starter)
        const playerMon = { ...MONSTERS['Ivieron'] };

        // Randomly select an enemy
        const monsterKeys = Object.keys(MONSTERS);
        const randomKey = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
        const enemyMon = { ...MONSTERS[randomKey] };

        // Give unique IDs for this battle instance
        playerMon.id = `p_${Date.now()}`;
        enemyMon.id = `e_${Date.now()}`;

        setBattleState({
            playerPokemon: playerMon,
            enemyPokemon: enemyMon,
            turn: 'PLAYER',
            message: `A wild ${enemyMon.name} appeared!`,
            phase: 'INTRO'
        });
        setMode('BATTLE');

        setTimeout(() => {
            setBattleState(prev => prev ? { ...prev, phase: 'MENU', message: `What will ${playerMon.name} do?` } : null);
        }, 2000);
    };

    const handleBattleAttack = async (moveName: string) => {
        if (!battleState) return;

        setBattleState(prev => prev ? { ...prev, message: 'Loading question...', selectedAttack: moveName } : null);

        const question = await getRandomMathQuestion();
        if (question) {
            setBattleState(prev => prev ? {
                ...prev,
                phase: 'QUESTION',
                message: 'Solve the problem to attack!',
                currentQuestion: {
                    text: question.text,
                    answer: question.answer
                }
            } : null);
        } else {
            // Fallback
            setBattleState(prev => prev ? {
                ...prev,
                phase: 'QUESTION',
                message: 'Solve: 5 + 7 = ?',
                currentQuestion: {
                    text: '5 + 7 = ?',
                    answer: '12'
                }
            } : null);
        }
    };

    const handleBattleAnswer = (answer: string) => {
        if (!battleState || !battleState.currentQuestion || !battleState.selectedAttack) return;

        // Simple check (case insensitive, trimmed)
        const isCorrect = answer.trim().toLowerCase() === battleState.currentQuestion.answer.trim().toLowerCase();
        const attack = ATTACKS[battleState.selectedAttack];
        const playerMon = battleState.playerPokemon;
        const enemyMon = battleState.enemyPokemon;

        if (isCorrect) {
            setBattleState(prev => prev ? {
                ...prev,
                phase: 'ATTACK',
                message: `Correct! ${playerMon.name} used ${attack.name.toUpperCase()}!`
            } : null);

            // Deal damage logic
            setTimeout(() => {
                setBattleState(currentState => {
                    if (!currentState) return null;

                    // Calculate Damage
                    // Using simplified formula from Python: roughly (Attack / Defense) * Power * LevelFactor
                    // Python: ((((2 * Lvl / 5 + 2) * Power * A / D) / 50) + 2)

                    const power = attack.amount * 10; // Scaling abstract amount to ~power
                    const damage = Math.floor(
                        ((((2 * playerMon.level / 5 + 2) * power * playerMon.stats.attack / enemyMon.stats.defense) / 50) + 2)
                    );

                    const newEnemyHp = Math.max(0, currentState.enemyPokemon.hp - damage);

                    // Consume Energy
                    const newPlayerEnergy = Math.max(0, currentState.playerPokemon.energy - attack.cost);
                    const updatedPlayer = { ...currentState.playerPokemon, energy: newPlayerEnergy };

                    if (newEnemyHp === 0) {
                        setTimeout(() => {
                            setMode('MAP');
                            setBattleState(null);
                        }, 2000);
                        return {
                            ...currentState,
                            playerPokemon: updatedPlayer,
                            enemyPokemon: { ...currentState.enemyPokemon, hp: 0 },
                            phase: 'RESULT',
                            message: `Wild ${currentState.enemyPokemon.name} fainted!`
                        };
                    } else {
                        // Enemy turn logic
                        setTimeout(() => {
                            setBattleState(bs => {
                                if (!bs) return null;

                                // Simple enemy AI: random move
                                const enemyMoveName = bs.enemyPokemon.abilities[Math.floor(Math.random() * bs.enemyPokemon.abilities.length)];
                                const enemyMove = ATTACKS[enemyMoveName] || ATTACKS['scratch'];

                                const enemyPower = enemyMove.amount * 10;
                                const enemyDamage = Math.floor(
                                    ((((2 * bs.enemyPokemon.level / 5 + 2) * enemyPower * bs.enemyPokemon.stats.attack / bs.playerPokemon.stats.defense) / 50) + 2)
                                );

                                const newPlayerHp = Math.max(0, bs.playerPokemon.hp - enemyDamage);

                                return {
                                    ...bs,
                                    playerPokemon: { ...bs.playerPokemon, hp: newPlayerHp },
                                    turn: 'PLAYER',
                                    phase: 'MENU',
                                    message: `Wild ${bs.enemyPokemon.name} used ${enemyMoveName.toUpperCase()}! (Dm: ${enemyDamage})`
                                };
                            });
                        }, 2000);

                        return {
                            ...currentState,
                            playerPokemon: updatedPlayer,
                            enemyPokemon: { ...currentState.enemyPokemon, hp: newEnemyHp },
                            turn: 'ENEMY',
                            phase: 'ATTACK',
                            message: `It dealt ${damage} damage!`
                        };
                    }
                });
            }, 1000);
        } else {
            setBattleState(prev => prev ? { ...prev, phase: 'ATTACK', message: 'Wrong! You missed!' } : null);
            setTimeout(() => {
                setBattleState(currentState => {
                    if (!currentState) return null;

                    // Enemy turn logic (same as above)
                    // ... Duplicated logic for brevity, ideally refactor enemy turn to function
                    setTimeout(() => {
                        setBattleState(bs => {
                            if (!bs) return null;
                            const enemyMoveName = bs.enemyPokemon.abilities[Math.floor(Math.random() * bs.enemyPokemon.abilities.length)];
                            const enemyMove = ATTACKS[enemyMoveName] || ATTACKS['scratch'];
                            const enemyPower = enemyMove.amount * 10;
                            const enemyDamage = Math.floor(
                                ((((2 * bs.enemyPokemon.level / 5 + 2) * enemyPower * bs.enemyPokemon.stats.attack / bs.playerPokemon.stats.defense) / 50) + 2)
                            );
                            const newPlayerHp = Math.max(0, bs.playerPokemon.hp - enemyDamage);
                            return {
                                ...bs,
                                playerPokemon: { ...bs.playerPokemon, hp: newPlayerHp },
                                turn: 'PLAYER',
                                phase: 'MENU',
                                message: `Wild ${bs.enemyPokemon.name} used ${enemyMoveName.toUpperCase()}! (Dm: ${enemyDamage})`
                            };
                        });
                    }, 2000);

                    return {
                        ...currentState,
                        turn: 'ENEMY',
                        phase: 'ATTACK',
                        message: `Math error! execution failed.`
                    };
                });
            }, 1000);
        }
    };

    const handleBattleRun = () => {
        setBattleState(prev => prev ? { ...prev, message: 'Got away safely!' } : null);
        setTimeout(() => {
            setMode('MAP');
            setBattleState(null);
        }, 1000);
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (mode === 'MAP') {
                switch (e.key) {
                    case 'ArrowUp': handleMove('UP'); break;
                    case 'ArrowDown': handleMove('DOWN'); break;
                    case 'ArrowLeft': handleMove('LEFT'); break;
                    case 'ArrowRight': handleMove('RIGHT'); break;
                    case 'z': case 'Enter': handleAction(); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleMove, mode, player]);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-900 p-4">

            <div className="relative w-[960px] h-[704px] overflow-hidden bg-black border-4 border-slate-700 rounded-lg shadow-2xl">
                {mode === 'MAP' || mode === 'DIALOG' || mode === 'INPUT' ? (
                    <>
                        <MapView
                            map={currentMap}
                            playerPos={player.position}
                            playerDir={player.direction}
                            isMoving={player.isMoving}
                        />
                        {/* Dialog Box */}
                        {(mode === 'DIALOG' || mode === 'INPUT') && dialog && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-blue-800 p-4 z-10 min-h-[100px]">
                                <p className="text-lg font-mono mb-2 text-black">{dialog[0]}</p>
                                {mode === 'DIALOG' && (
                                    <Button size="sm" onClick={() => {
                                        if (dialog.length > 1) {
                                            setDialog(dialog.slice(1));
                                        } else {
                                            setMode('MAP');
                                            setDialog(null);
                                        }
                                    }}>Next</Button>
                                )}
                                {mode === 'INPUT' && dialog.length === 1 && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            className="border-2 border-black p-1 font-mono text-black"
                                            placeholder="Enter number..."
                                            autoFocus
                                        />
                                        <Button onClick={handlePuzzleSubmit}>Submit</Button>
                                        <Button variant="outline" onClick={() => { setMode('MAP'); setDialog(null); }}>Cancel</Button>
                                    </div>
                                )}
                                {mode === 'INPUT' && dialog.length > 1 && (
                                    <Button size="sm" onClick={() => setDialog(dialog.slice(1))}>Next</Button>
                                )}
                            </div>
                        )}
                    </>
                ) : mode === 'BATTLE' && battleState ? (
                    <BattleView
                        battleState={battleState}
                        onAttack={handleBattleAttack}
                        onRun={handleBattleRun}
                        onAnswer={handleBattleAnswer}
                    />
                ) : null}
            </div>

            {/* Mobile Controls */}
            <div className="absolute bottom-8 right-8 grid grid-cols-3 gap-2 md:hidden">
                <div />
                <Button variant="secondary" onClick={() => handleMove('UP')}><ArrowUp /></Button>
                <div />
                <Button variant="secondary" onClick={() => handleMove('LEFT')}><ArrowLeft /></Button>
                <Button variant="destructive" onClick={handleAction} className="rounded-full w-12 h-12">A</Button>
                <Button variant="secondary" onClick={() => handleMove('RIGHT')}><ArrowRight /></Button>
                <div />
                <Button variant="secondary" onClick={() => handleMove('DOWN')}><ArrowDown /></Button>
                <div />
            </div>

        </div>
    );
};

export default GameEngine;
