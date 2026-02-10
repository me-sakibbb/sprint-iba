import { describe, it, expect } from 'vitest';
import { getMotivationalMessage } from './vpCalculations';

describe('getMotivationalMessage', () => {
    it('returns "Level up! You\'re unstoppable!" for 100% progress', () => {
        expect(getMotivationalMessage(100)).toBe("Level up! You're unstoppable!");
    });

    it('returns "Almost there! One final push!" for progress between 90% and 99%', () => {
        expect(getMotivationalMessage(90)).toBe("Almost there! One final push!");
        expect(getMotivationalMessage(95)).toBe("Almost there! One final push!");
        expect(getMotivationalMessage(99)).toBe("Almost there! One final push!");
    });

    it('returns "You\'re in the home stretch!" for progress between 75% and 89%', () => {
        expect(getMotivationalMessage(75)).toBe("You're in the home stretch!");
        expect(getMotivationalMessage(80)).toBe("You're in the home stretch!");
        expect(getMotivationalMessage(89)).toBe("You're in the home stretch!");
    });

    it('returns "Halfway there! Keep the momentum!" for progress between 50% and 74%', () => {
        expect(getMotivationalMessage(50)).toBe("Halfway there! Keep the momentum!");
        expect(getMotivationalMessage(60)).toBe("Halfway there! Keep the momentum!");
        expect(getMotivationalMessage(74)).toBe("Halfway there! Keep the momentum!");
    });

    it('returns "Great progress! Stay focused!" for progress between 25% and 49%', () => {
        expect(getMotivationalMessage(25)).toBe("Great progress! Stay focused!");
        expect(getMotivationalMessage(35)).toBe("Great progress! Stay focused!");
        expect(getMotivationalMessage(49)).toBe("Great progress! Stay focused!");
    });

    it('returns "Every sprint starts with a single step!" for progress less than 25%', () => {
        expect(getMotivationalMessage(0)).toBe("Every sprint starts with a single step!");
        expect(getMotivationalMessage(10)).toBe("Every sprint starts with a single step!");
        expect(getMotivationalMessage(24)).toBe("Every sprint starts with a single step!");
    });

    it('handles negative numbers gracefully', () => {
        expect(getMotivationalMessage(-10)).toBe("Every sprint starts with a single step!");
    });

    it('handles numbers greater than 100 by treating them as high progress', () => {
        // Based on current implementation logic: >= 90 returns "Almost there"
        // 100 returns "Level up"
        // > 100 falls into >= 90 check unless explicitly handled
        expect(getMotivationalMessage(101)).toBe("Almost there! One final push!");
    });
});
