import React, { useState } from 'react';
import { BattleState } from '../types';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ATTACKS } from '../data/attacks'; // Import attacks

interface BattleViewProps {
    battleState: BattleState;
    onAttack: (moveName: string) => void;
    onRun: () => void;
    onAnswer: (answer: string) => void;
}

const BattleView: React.FC<BattleViewProps> = ({ battleState, onAttack, onRun, onAnswer }) => {
    const { playerPokemon, enemyPokemon, message, phase } = battleState;
    const [answerInput, setAnswerInput] = useState("");

    const handleAnswerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAnswer(answerInput);
        setAnswerInput("");
    };

    return (
        <div className="relative w-full h-full bg-slate-800 flex items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <img src="/assets/pokemon/Battlebacks/field_bg.png" className="w-full h-full object-cover" alt="Battle Background" />
            </div>

            {/* Bases */}
            <div className="absolute bottom-10 left-10 z-10">
                <img src="/assets/pokemon/Battlebacks/field_base0.png" className="w-64" alt="Player Base" />
            </div>
            <div className="absolute top-20 right-10 z-10">
                <img src="/assets/pokemon/Battlebacks/field_base1.png" className="w-64" alt="Enemy Base" />
            </div>

            {/* Pokemon */}
            <div className="absolute bottom-20 left-20 z-20 animate-bounce-slow">
                <img src={playerPokemon.spriteBack} className="w-48 h-48 object-contain pixelated" alt={playerPokemon.name} />
            </div>
            <div className="absolute top-24 right-24 z-20 animate-float">
                <img src={enemyPokemon.spriteFront} className="w-40 h-40 object-contain pixelated" alt={enemyPokemon.name} />
            </div>

            {/* HUDs */}
            <div className="absolute top-10 left-10 bg-white/90 p-4 rounded-lg shadow-lg border-2 border-slate-600 z-30 w-64">
                <h3 className="font-bold text-lg flex justify-between">
                    {enemyPokemon.name}
                    <span className="text-sm text-slate-500">Lv{enemyPokemon.level}</span>
                </h3>
                <Progress value={(enemyPokemon.hp / enemyPokemon.maxHp) * 100} className="h-2 mt-2 bg-slate-200 [&>div]:bg-red-500" />
            </div>

            <div className="absolute bottom-32 right-10 bg-white/90 p-4 rounded-lg shadow-lg border-2 border-slate-600 z-30 w-64">
                <h3 className="font-bold text-lg flex justify-between">
                    {playerPokemon.name}
                    <span className="text-sm text-slate-500">Lv{playerPokemon.level}</span>
                </h3>
                <Progress value={(playerPokemon.hp / playerPokemon.maxHp) * 100} className="h-2 mt-2 bg-slate-200 [&>div]:bg-green-500" />
                <div className="flex justify-between items-center mt-1">
                    <p className="text-sm font-mono text-slate-600">HP: {playerPokemon.hp.toFixed(0)}/{playerPokemon.maxHp}</p>
                    <p className="text-xs font-mono text-blue-600">NRG: {playerPokemon.energy.toFixed(0)}</p>
                </div>
            </div>

            {/* Message/Action Box */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-slate-900/90 border-t-4 border-slate-600 p-4 z-40 flex gap-4">
                <div className="flex-1 bg-slate-800 rounded p-4 border-2 border-slate-600 text-white text-xl font-mono">
                    {phase === 'QUESTION' && battleState.currentQuestion ? (
                        <div>
                            <p className="mb-2">Solve: {battleState.currentQuestion.text}</p>
                            <form onSubmit={handleAnswerSubmit} className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={answerInput}
                                    onChange={(e) => setAnswerInput(e.target.value)}
                                    className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-white w-32"
                                />
                                <Button type="submit" size="sm">Submit</Button>
                            </form>
                        </div>
                    ) : (
                        <p>{message}</p>
                    )}
                </div>

                {phase === 'MENU' && (
                    <div className="w-80 grid grid-cols-2 gap-2 overflow-y-auto">
                        {playerPokemon.abilities.map((ability) => {
                            const attackData = ATTACKS[ability];
                            const cost = attackData ? attackData.cost : 0;
                            const element = attackData ? attackData.element : 'normal';

                            let colorClass = "bg-slate-600 hover:bg-slate-700";
                            if (element === 'fire') colorClass = "bg-red-600 hover:bg-red-700";
                            if (element === 'water') colorClass = "bg-blue-600 hover:bg-blue-700";
                            if (element === 'plant') colorClass = "bg-green-600 hover:bg-green-700";

                            return (
                                <Button
                                    key={ability}
                                    onClick={() => onAttack(ability)}
                                    className={`${colorClass} text-white font-bold text-xs uppercase flex justify-between`}
                                    disabled={playerPokemon.energy < cost}
                                >
                                    <span>{ability}</span>
                                    <span className="text-[10px] opacity-75">{cost} E</span>
                                </Button>
                            );
                        })}
                        <Button onClick={onRun} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs">RUN</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BattleView;
