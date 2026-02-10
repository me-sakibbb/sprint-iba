import { describe, it, expect } from 'vitest';
import { calculateCorrectAnswerVP, VP_REWARDS } from './vpCalculations';

describe('calculateCorrectAnswerVP', () => {
    it('should return the correct answer VP reward (100)', () => {
        expect(calculateCorrectAnswerVP()).toBe(100);
    });

    it('should return the same value as VP_REWARDS.CORRECT_ANSWER', () => {
        expect(calculateCorrectAnswerVP()).toBe(VP_REWARDS.CORRECT_ANSWER);
    });

    it('should return a number', () => {
        expect(typeof calculateCorrectAnswerVP()).toBe('number');
    });

    it('should return a positive value', () => {
        expect(calculateCorrectAnswerVP()).toBeGreaterThan(0);
    });
});
