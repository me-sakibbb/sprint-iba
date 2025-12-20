import React, { useEffect, useRef, useState } from 'react';
import { GBAMemoryWatcher, MEMORY_ADDRESSES } from './Emulator/GBAMemoryWatcher';
import QuestionOverlay, { Question } from './Emulator/QuestionOverlay';
import { fetchEmulatorQuestion, getSubjectFromMemoryValue } from './Emulator/questionService';

declare global {
    interface Window {
        EJS_player: string;
        EJS_core: string;
        EJS_gameUrl: string;
        EJS_pathtodata: string;
        EJS_startOnLoaded?: boolean;
        EJS_emulator?: any; // EmulatorJS instance
    }
}

const Emulator: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scriptLoadedRef = useRef(false);
    const memoryWatcherRef = useRef<GBAMemoryWatcher | null>(null);

    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [showQuestionOverlay, setShowQuestionOverlay] = useState(false);

    useEffect(() => {
        // Configure EmulatorJS
        window.EJS_player = '#game-container';
        window.EJS_core = 'gba'; // Game Boy Advance core
        window.EJS_gameUrl = 'games/Pokemon - FireRed Version (USA, Europe) (Rev 1).gba';
        window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/'; // Use CDN for cores
        window.EJS_startOnLoaded = true;

        // Load EmulatorJS loader script from CDN
        if (!scriptLoadedRef.current) {
            const script = document.createElement('script');
            script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js'; // Use CDN loader
            script.async = true;
            script.onload = () => {
                console.log('EmulatorJS loaded successfully from CDN');
                // Initialize memory watcher after emulator loads
                initializeMemoryWatcher();
            };
            script.onerror = () => {
                console.error('Failed to load EmulatorJS from CDN');
            };
            document.body.appendChild(script);
            scriptLoadedRef.current = true;

            // Cleanup on unmount
            return () => {
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                // Cleanup memory watcher
                if (memoryWatcherRef.current) {
                    memoryWatcherRef.current.destroy();
                }
            };
        }
    }, []);

    const initializeMemoryWatcher = () => {
        // Wait for emulator to be ready
        const checkEmulator = setInterval(() => {
            if (window.EJS_emulator) {
                clearInterval(checkEmulator);
                console.log('Emulator ready, initializing memory watcher...');

                // Create and configure memory watcher
                const watcher = new GBAMemoryWatcher(500); // Check every 500ms
                watcher.setEmulator(window.EJS_emulator);

                // Add trigger for question requests
                watcher.addTrigger({
                    address: MEMORY_ADDRESSES.QUESTION_TRIGGER,
                    expectedValue: 1,
                    callback: handleQuestionTrigger,
                });

                watcher.startWatching();
                memoryWatcherRef.current = watcher;
                console.log('Memory watcher initialized and started');
            }
        }, 1000);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkEmulator);
            if (!window.EJS_emulator) {
                console.warn('Emulator did not load within 30 seconds');
            }
        }, 30000);
    };

    const handleQuestionTrigger = async (value: number) => {
        console.log('Question trigger detected!');

        // Pause the emulator
        if (window.EJS_emulator) {
            window.EJS_emulator.pause();
            console.log('Emulator paused');
        }

        // Read question type from memory (if implemented)
        let questionType: 'Math' | 'Analytical' | 'English' = 'Math';
        if (window.EJS_emulator && window.EJS_emulator.Module && window.EJS_emulator.Module.HEAPU8) {
            try {
                const typeValue = window.EJS_emulator.Module.HEAPU8[MEMORY_ADDRESSES.QUESTION_TYPE];
                questionType = getSubjectFromMemoryValue(typeValue);
                console.log(`Question type from memory: ${typeValue} => ${questionType}`);
            } catch (error) {
                console.error('Error reading question type from memory:', error);
            }
        }

        // Fetch question from Supabase
        const question = await fetchEmulatorQuestion(questionType);

        if (question) {
            setCurrentQuestion(question);
            setShowQuestionOverlay(true);
        } else {
            console.error('Failed to fetch question, resuming game');
            if (window.EJS_emulator) {
                window.EJS_emulator.resume();
            }
        }
    };

    const handleAnswer = (selectedOption: 'A' | 'B' | 'C' | 'D', isCorrect: boolean) => {
        console.log(`Answer submitted: ${selectedOption}, Correct: ${isCorrect}`);

        // Write result to memory
        if (memoryWatcherRef.current) {
            memoryWatcherRef.current.writeMemory(
                MEMORY_ADDRESSES.ANSWER_RESULT,
                isCorrect ? 1 : 0
            );
        }

        // Hide overlay
        setShowQuestionOverlay(false);
        setCurrentQuestion(null);

        // Resume the emulator
        if (window.EJS_emulator) {
            window.EJS_emulator.resume();
            console.log('Emulator resumed');
        }
    };

    const handleCloseOverlay = () => {
        // Write 0 (incorrect) to indicate user closed without answering
        if (memoryWatcherRef.current) {
            memoryWatcherRef.current.writeMemory(MEMORY_ADDRESSES.ANSWER_RESULT, 0);
        }

        setShowQuestionOverlay(false);
        setCurrentQuestion(null);

        // Resume the emulator
        if (window.EJS_emulator) {
            window.EJS_emulator.resume();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Numbers Town - GBA Edition
                    </h1>
                    <p className="text-gray-300 mb-2">
                        Pokemon FireRed with integrated math challenges from Supabase
                    </p>
                    <div className="text-sm text-blue-400 bg-blue-900/20 border border-blue-600 rounded p-3 max-w-2xl mx-auto">
                        <strong>💡 Interactive Learning:</strong> NPCs will trigger math questions that pause the game!
                    </div>
                </div>

                {/* Emulator Container with Overlay */}
                <div className="relative bg-black rounded-lg shadow-2xl overflow-hidden mb-8">
                    <div
                        id="game-container"
                        ref={containerRef}
                        className="w-full aspect-[3/2] min-h-[400px]"
                    />

                    {/* Question Overlay */}
                    <QuestionOverlay
                        question={currentQuestion}
                        isVisible={showQuestionOverlay}
                        onAnswer={handleAnswer}
                        onClose={handleCloseOverlay}
                    />
                </div>

                {/* Instructions */}
                <div className="bg-slate-800 rounded-lg p-6 text-white">
                    <h2 className="text-2xl font-bold mb-4">How It Works</h2>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-blue-400 mb-2">🎮 Playing the Game</h3>
                            <p className="text-gray-300">
                                Play Pokemon FireRed normally using keyboard controls (Arrow keys, Z/X for A/B).
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-blue-400 mb-2">📚 Numbers Town NPCs</h3>
                            <p className="text-gray-300 mb-2">
                                When you interact with certain NPCs in the region, they will trigger a math question:
                            </p>
                            <ol className="list-decimal list-inside text-gray-400 ml-4 space-y-1">
                                <li>The game automatically pauses</li>
                                <li>A question overlay appears from your Supabase database</li>
                                <li>Answer correctly to continue the battle</li>
                                <li>Wrong answers send you back to try again</li>
                            </ol>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-blue-400 mb-2">🔧 ROM Hacking Setup</h3>
                            <p className="text-gray-300 mb-2">
                                To enable this feature, you need to modify the ROM using XSE (eXtreme Script Editor):
                            </p>
                            <div className="bg-slate-900 p-4 rounded mt-2 font-mono text-sm text-gray-400 overflow-x-auto">
                                <pre>{`writebytetooffset 0x0203FFFF 0x01
waitstate
compare LASTRESULT 0x1
if 0x1 goto @battle`}</pre>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-blue-400 mb-2">✨ Features</h3>
                            <ul className="list-disc list-inside text-gray-300 space-y-1">
                                <li>Real-time memory watching (0x0203FFFF)</li>
                                <li>Automatic game pause/resume</li>
                                <li>Questions fetched from your Supabase database</li>
                                <li>Support for Math, Analytical, and English questions</li>
                                <li>Clean UI overlay with instant feedback</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Emulator;
