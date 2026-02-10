import { describe, it, expect } from 'vitest';
import { getMotivationalMessage } from './vpCalculations';

describe('getMotivationalMessage', () => {
    it('returns "Level up! You\'re unstoppable!" when progress is exactly 100', () => {
        expect(getMotivationalMessage(100)).toBe("Level up! You're unstoppable!");
    });

    it('returns "Almost there! One final push!" when progress is between 90 and 99', () => {
        expect(getMotivationalMessage(90)).toBe("Almost there! One final push!");
        expect(getMotivationalMessage(95)).toBe("Almost there! One final push!");
        expect(getMotivationalMessage(99)).toBe("Almost there! One final push!");
    });

    it('returns "You\'re in the home stretch!" when progress is between 75 and 89', () => {
        expect(getMotivationalMessage(75)).toBe("You're in the home stretch!");
        expect(getMotivationalMessage(80)).toBe("You're in the home stretch!");
        expect(getMotivationalMessage(89)).toBe("You're in the home stretch!");
    });

    it('returns "Halfway there! Keep the momentum!" when progress is between 50 and 74', () => {
        expect(getMotivationalMessage(50)).toBe("Halfway there! Keep the momentum!");
        expect(getMotivationalMessage(60)).toBe("Halfway there! Keep the momentum!");
        expect(getMotivationalMessage(74)).toBe("Halfway there! Keep the momentum!");
    });

    it('returns "Great progress! Stay focused!" when progress is between 25 and 49', () => {
        expect(getMotivationalMessage(25)).toBe("Great progress! Stay focused!");
        expect(getMotivationalMessage(35)).toBe("Great progress! Stay focused!");
        expect(getMotivationalMessage(49)).toBe("Great progress! Stay focused!");
    });

    it('returns "Every sprint starts with a single step!" when progress is below 25', () => {
        expect(getMotivationalMessage(0)).toBe("Every sprint starts with a single step!");
        expect(getMotivationalMessage(10)).toBe("Every sprint starts with a single step!");
        expect(getMotivationalMessage(24)).toBe("Every sprint starts with a single step!");
    });
});
