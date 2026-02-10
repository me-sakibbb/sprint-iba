import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../use-debounce';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should update value after the specified delay', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        rerender({ value: 'updated', delay: 500 });

        // Should still be initial before delay
        expect(result.current).toBe('initial');

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('updated');
    });

    it('should not update value before the delay', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        rerender({ value: 'updated', delay: 500 });

        act(() => {
            vi.advanceTimersByTime(499);
        });

        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(result.current).toBe('updated');
    });

    it('should debounce multiple updates', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        rerender({ value: 'update1', delay: 500 });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'update2', delay: 500 });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'update3', delay: 500 });

        // Timer reset on each update.
        // We are now at T+400ms (relative to start), but the latest timer was set just now.
        // It should fire 500ms from now.

        act(() => {
            vi.advanceTimersByTime(499);
        });

        // Should still be initial because last update reset timer
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(result.current).toBe('update3');
    });

    it('should work with custom delay', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 1000 } }
        );

        rerender({ value: 'updated', delay: 1000 });

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('updated');
    });

    it('should use default delay of 500ms if not provided', () => {
         const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value),
            { initialProps: { value: 'initial' } }
        );

        rerender({ value: 'updated' });

        act(() => {
            vi.advanceTimersByTime(499);
        });

        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(result.current).toBe('updated');
    });
});
