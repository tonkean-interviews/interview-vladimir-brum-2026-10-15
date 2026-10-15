export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Ticket {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    reporter: string;
    status: 'OPEN';
    createdAt: string;
}

export type NewTicket = Pick<Ticket, 'title' | 'description' | 'priority' | 'reporter'>;

const SEED: NewTicket[] = [
    {
        title: 'The "New ticket notification" module is not working',
        description:
            'New tickets are no longer announced in Chatter: after a ticket is created, no message is added to ' +
            'the #new_tickets channel. The Data Sources tab in Tiny Tonkean also shows an error for the Tickets ' +
            'data source.',
        priority: 'URGENT',
        reporter: 'dana@tonkean.com',
    },
];

/** In-memory only: tickets reset when the service restarts. */
export class TicketStore {
    private readonly tickets: Ticket[] = [];
    private lastNumber = 0;

    constructor() {
        SEED.forEach((ticket) => this.create(ticket));
    }

    list(): Ticket[] {
        return [...this.tickets].reverse();
    }

    find(id: string): Ticket | undefined {
        return this.tickets.find((ticket) => ticket.id === id);
    }

    create(input: NewTicket): Ticket {
        this.lastNumber += 1;
        const ticket: Ticket = {
            id: `TCK-${this.lastNumber}`,
            ...input,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
        };
        this.tickets.push(ticket);
        return ticket;
    }
}
