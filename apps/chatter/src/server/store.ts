import { randomUUID } from 'node:crypto';

export interface ChatterMessage {
    id: string;
    channel: string;
    author: string;
    text: string;
    createdAt: string;
}

const SEED: Record<string, { author: string; text: string }[]> = {
    general: [
        { author: 'Dana', text: 'Welcome to Chatter!' },
        { author: 'Omer', text: 'Reminder: team sync at 11:00.' },
    ],
    new_tickets: [{ author: 'Dana', text: 'New tickets are announced here.' }],
    new_urgent_tickets: [{ author: 'Dana', text: 'New urgent tickets are announced here.' }],
};

/** In-memory only: messages reset when the service restarts. */
export class ChatterStore {
    private readonly channels = new Map<string, ChatterMessage[]>();

    constructor() {
        for (const [channel, messages] of Object.entries(SEED)) {
            this.channels.set(channel, []);
            messages.forEach((message) => this.post(channel, message.author, message.text));
        }
    }

    listChannels(): string[] {
        return [...this.channels.keys()];
    }

    listMessages(channel: string): ChatterMessage[] | undefined {
        return this.channels.get(channel);
    }

    post(channel: string, author: string, text: string): ChatterMessage | undefined {
        const messages = this.channels.get(channel);
        if (!messages) {
            return undefined;
        }
        const message = { id: randomUUID(), channel, author, text, createdAt: new Date().toISOString() };
        messages.push(message);
        return message;
    }
}
