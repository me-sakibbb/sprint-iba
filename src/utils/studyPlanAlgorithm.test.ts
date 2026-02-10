import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDaysBetween } from './studyPlanAlgorithm.js';

describe('getDaysBetween', () => {
    it('returns 0 for same dates', () => {
        const start = new Date('2023-01-01T12:00:00');
        const end = new Date('2023-01-01T12:00:00');
        assert.strictEqual(getDaysBetween(start, end), 0);
    });

    it('returns 1 for next day same time', () => {
        const start = new Date('2023-01-01T12:00:00');
        const end = new Date('2023-01-02T12:00:00');
        assert.strictEqual(getDaysBetween(start, end), 1);
    });

    it('returns 1 for partial day difference (positive)', () => {
        const start = new Date('2023-01-01T12:00:00');
        const end = new Date('2023-01-02T00:00:00'); // 12 hours diff
        // 12/24 = 0.5 -> ceil(0.5) = 1
        assert.strictEqual(getDaysBetween(start, end), 1);
    });

    it('returns 1 for minimal positive difference', () => {
        const start = new Date('2023-01-01T12:00:00');
        const end = new Date('2023-01-01T12:00:01'); // 1 second diff
        // 1/86400 -> small positive -> ceil = 1
        assert.strictEqual(getDaysBetween(start, end), 1);
    });

    it('returns 2 for slightly more than 1 day difference', () => {
        const start = new Date('2023-01-01T12:00:00');
        const end = new Date('2023-01-02T12:00:01'); // 24h + 1s
        // 1.00001 -> ceil = 2
        assert.strictEqual(getDaysBetween(start, end), 2);
    });

    it('handles month transitions correctly', () => {
        const start = new Date('2023-01-31T12:00:00');
        const end = new Date('2023-02-01T12:00:00');
        assert.strictEqual(getDaysBetween(start, end), 1);
    });

    it('handles year transitions correctly', () => {
        const start = new Date('2022-12-31T12:00:00');
        const end = new Date('2023-01-01T12:00:00');
        assert.strictEqual(getDaysBetween(start, end), 1);
    });

    it('handles leap years correctly', () => {
        // 2024 is a leap year
        const start = new Date('2024-02-28T12:00:00');
        const end = new Date('2024-03-01T12:00:00');
        // Feb 28 -> Feb 29 -> Mar 1 = 2 days
        assert.strictEqual(getDaysBetween(start, end), 2);

        // 2023 is not a leap year
        const startNonLeap = new Date('2023-02-28T12:00:00');
        const endNonLeap = new Date('2023-03-01T12:00:00');
        // Feb 28 -> Mar 1 = 1 day
        assert.strictEqual(getDaysBetween(startNonLeap, endNonLeap), 1);
    });

    it('returns positive days even if start is after end', () => {
        const start = new Date('2023-01-02T12:00:00');
        const end = new Date('2023-01-01T12:00:00');
        assert.strictEqual(getDaysBetween(start, end), 1);
    });
});
