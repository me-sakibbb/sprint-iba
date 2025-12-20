/**
 * GBA Memory Watcher Service
 * Monitors specific memory addresses in the GBA emulator and triggers callbacks
 */

export interface MemoryTrigger {
    address: number;
    expectedValue: number;
    callback: (value: number) => void;
}

export class GBAMemoryWatcher {
    private triggers: MemoryTrigger[] = [];
    private intervalId: number | null = null;
    private checkIntervalMs: number = 500;
    private emulator: any = null;

    constructor(checkIntervalMs: number = 500) {
        this.checkIntervalMs = checkIntervalMs;
    }

    /**
     * Set the emulator instance to watch
     */
    setEmulator(emulator: any) {
        this.emulator = emulator;
    }

    /**
     * Add a memory address to watch
     */
    addTrigger(trigger: MemoryTrigger) {
        this.triggers.push(trigger);
    }

    /**
     * Remove a specific trigger
     */
    removeTrigger(address: number) {
        this.triggers = this.triggers.filter(t => t.address !== address);
    }

    /**
     * Start watching memory
     */
    startWatching() {
        if (this.intervalId) {
            console.warn('Memory watcher already running');
            return;
        }

        if (!this.emulator) {
            console.error('No emulator instance set. Call setEmulator() first.');
            return;
        }

        console.log('Starting GBA memory watcher...');
        this.intervalId = setInterval(() => {
            this.checkMemory();
        }, this.checkIntervalMs) as unknown as number;
    }

    /**
     * Stop watching memory
     */
    stopWatching() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Memory watcher stopped');
        }
    }

    /**
     * Check all registered memory addresses
     */
    private checkMemory() {
        if (!this.emulator) return;

        try {
            // EmulatorJS stores memory in Module.HEAPU8
            const Module = this.emulator.Module;
            if (!Module || !Module.HEAPU8) return;

            this.triggers.forEach(trigger => {
                const value = Module.HEAPU8[trigger.address];

                if (value === trigger.expectedValue) {
                    console.log(`Memory trigger detected at 0x${trigger.address.toString(16).toUpperCase()}: ${value}`);
                    trigger.callback(value);

                    // Reset the trigger value to prevent repeated firing
                    this.resetTrigger(trigger.address);
                }
            });
        } catch (error) {
            console.error('Error reading emulator memory:', error);
        }
    }

    /**
     * Reset a specific memory address to 0
     */
    resetTrigger(address: number) {
        try {
            if (this.emulator && this.emulator.Module && this.emulator.Module.HEAPU8) {
                this.emulator.Module.HEAPU8[address] = 0;
            }
        } catch (error) {
            console.error('Error resetting trigger:', error);
        }
    }

    /**
     * Write a value to a specific memory address (for validation results)
     */
    writeMemory(address: number, value: number) {
        try {
            if (this.emulator && this.emulator.Module && this.emulator.Module.HEAPU8) {
                this.emulator.Module.HEAPU8[address] = value;
                console.log(`Wrote ${value} to 0x${address.toString(16).toUpperCase()}`);
            }
        } catch (error) {
            console.error('Error writing to memory:', error);
        }
    }

    /**
     * Clean up and stop watching
     */
    destroy() {
        this.stopWatching();
        this.triggers = [];
        this.emulator = null;
    }
}

// Predefined memory addresses for the Numbers Town integration
// Using Pokemon FireRed game variables instead of arbitrary RAM addresses
export const MEMORY_ADDRESSES = {
    QUESTION_TRIGGER: 0x020370B0,  // VAR 0x8000 - When NPC triggers question
    ANSWER_RESULT: 0x020370B2,     // VAR 0x8001 - Write 1=correct, 0=incorrect  
    QUESTION_TYPE: 0x020370B4,     // VAR 0x8002 - 1=Math, 2=Analytical, 3=English
} as const;
