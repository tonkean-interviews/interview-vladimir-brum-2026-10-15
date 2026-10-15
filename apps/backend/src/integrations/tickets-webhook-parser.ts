import type { TicketSummary } from '@tiny-tonkean/shared/data-sources';
import type { ExternalActivityInput } from '../webhooks/external-activities.repository';

export interface TicketsWebhookEvent {
    id?: string;
    event?: string;
    subscriptionId?: string;
    occurredAt?: string;
    data?: { ticket?: Partial<TicketSummary> };
}

export function buildTicketPayload(ticket: TicketSummary): Record<string, unknown> {
    return {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        reporter: ticket.reporter,
        createdAt: ticket.createdAt,
    };
}

/** Turns a `ticket.created` delivery from the ticketing service into activities. */
export function parseTicketsEvent(event: TicketsWebhookEvent, dataSourceId: string): ExternalActivityInput[] {
    const ticket = event.data?.ticket;
    if (event.event !== 'ticket.created' || !ticket?.id) {
        return [];
    }
    return [
        {
            dataSourceId,
            type: 'TICKET_CREATED',
            entityKey: ticket.id,
            payload: buildTicketPayload({
                id: ticket.id,
                title: ticket.title ?? '',
                description: ticket.description ?? '',
                priority: ticket.priority ?? '',
                reporter: ticket.reporter ?? '',
                createdAt: ticket.createdAt ?? event.occurredAt ?? '',
            }),
        },
    ];
}
