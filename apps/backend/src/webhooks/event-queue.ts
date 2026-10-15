export interface Logger {
    error: (object: unknown, message: string) => void;
}

/**
 * Stand-in for Tonkean's event bus: the webhook endpoint enqueues and returns immediately, and a single
 * consumer processes events in order. Events still in the queue are lost if the process exits.
 */
export class EventQueue<TEvent> {
    private readonly events: TEvent[] = [];
    private draining = false;
    private idleWaiters: (() => void)[] = [];

    constructor(
        private readonly handle: (event: TEvent) => Promise<void>,
        private readonly logger: Logger,
    ) {}

    enqueue(event: TEvent): void {
        this.events.push(event);
        if (!this.draining) {
            this.draining = true;
            setImmediate(() => void this.drain());
        }
    }

    /** Resolves once every queued event has been handled. */
    onIdle(): Promise<void> {
        if (!this.draining) {
            return Promise.resolve();
        }
        return new Promise((resolve) => this.idleWaiters.push(resolve));
    }

    private async drain(): Promise<void> {
        while (this.events.length > 0) {
            const event = this.events.shift()!;
            try {
                await this.handle(event);
            } catch (error) {
                this.logger.error({ err: error }, 'Failed to handle queued event');
            }
        }
        this.draining = false;
        const waiters = this.idleWaiters;
        this.idleWaiters = [];
        waiters.forEach((resolve) => resolve());
    }
}
