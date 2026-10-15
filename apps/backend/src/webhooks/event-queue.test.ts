import { describe, expect, it, vi } from 'vitest';
import { EventQueue } from './event-queue';

describe('EventQueue', () => {
    it('handles events in order, after enqueue returns', async () => {
        const handled: number[] = [];
        const queue = new EventQueue<number>(async (event) => void handled.push(event), { error: vi.fn() });

        queue.enqueue(1);
        queue.enqueue(2);
        expect(handled).toEqual([]);

        await queue.onIdle();
        expect(handled).toEqual([1, 2]);
    });

    it('keeps going after a handler fails', async () => {
        const logger = { error: vi.fn() };
        const handled: number[] = [];
        const queue = new EventQueue<number>(async (event) => {
            if (event === 1) {
                throw new Error('boom');
            }
            handled.push(event);
        }, logger);

        queue.enqueue(1);
        queue.enqueue(2);
        await queue.onIdle();

        expect(handled).toEqual([2]);
        expect(logger.error).toHaveBeenCalledOnce();
    });
});
