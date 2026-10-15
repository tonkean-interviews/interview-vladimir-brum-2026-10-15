import { describe, expect, it } from 'vitest';
import { parseTicketsEvent } from './tickets-webhook-parser';

const ticket = {
    id: 'TCK-3',
    title: 'Printer is on fire',
    description: 'Third floor',
    priority: 'URGENT',
    reporter: 'dana@tonkean.com',
    status: 'OPEN',
    createdAt: '2026-09-29T10:00:00.000Z',
};

describe('parseTicketsEvent', () => {
    it('turns ticket.created into a TICKET_CREATED activity', () => {
        const activities = parseTicketsEvent({ event: 'ticket.created', data: { ticket } }, 'DS_tickets');

        expect(activities).toEqual([
            {
                dataSourceId: 'DS_tickets',
                type: 'TICKET_CREATED',
                entityKey: 'TCK-3',
                payload: {
                    id: 'TCK-3',
                    title: 'Printer is on fire',
                    description: 'Third floor',
                    priority: 'URGENT',
                    reporter: 'dana@tonkean.com',
                    createdAt: '2026-09-29T10:00:00.000Z',
                },
            },
        ]);
    });

    it('ignores other events', () => {
        expect(parseTicketsEvent({ event: 'webhook.ping', data: {} }, 'DS_tickets')).toEqual([]);
    });

    it('ignores events without a ticket id', () => {
        expect(parseTicketsEvent({ event: 'ticket.created', data: {} }, 'DS_tickets')).toEqual([]);
    });
});
