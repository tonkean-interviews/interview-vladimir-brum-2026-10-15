import type { TicketsDataSourceConfig, TicketSummary } from '@tiny-tonkean/shared/data-sources';
import { config } from '../config';
import { getOrCreateIncomingWebhook, updateIncomingWebhook } from '../webhooks/incoming-webhooks.repository';
import { waitForWebhookConfirmation } from '../webhooks/webhook-confirmation';
import { buildWebhookUrl } from '../webhooks/webhook-secret';
import { buildTicketPayload } from './tickets-webhook-parser';

interface TicketsWebhookSubscription {
    id: string;
    url: string;
    events: string[];
}

export class TicketNotFoundError extends Error {}

async function ticketsRequest<T>(ticketsConfig: TicketsDataSourceConfig, path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${ticketsConfig.baseUrl}${path}`, {
        ...init,
        headers: {
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${ticketsConfig.apiToken}`,
            ...init?.headers,
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Tickets responded ${response.status}: ${body}`);
    }
    if (response.status === 204) {
        return undefined as T;
    }
    return (await response.json()) as T;
}

export async function testTicketsConnection(ticketsConfig: TicketsDataSourceConfig): Promise<void> {
    // Webhook management needs the API token, so this also validates the token.
    await ticketsRequest(ticketsConfig, '/api/webhooks');
}

export async function listTickets(ticketsConfig: TicketsDataSourceConfig): Promise<TicketSummary[]> {
    const { tickets } = await ticketsRequest<{ tickets: TicketSummary[] }>(ticketsConfig, '/api/tickets');
    return tickets;
}

export async function getTicketPayload(ticketsConfig: TicketsDataSourceConfig, ticketId: string) {
    const response = await fetch(`${ticketsConfig.baseUrl}/api/tickets/${encodeURIComponent(ticketId)}`);
    if (response.status === 404) {
        throw new TicketNotFoundError(`Ticket "${ticketId}" was not found`);
    }
    if (!response.ok) {
        throw new Error(`Tickets responded ${response.status}`);
    }
    const { ticket } = (await response.json()) as { ticket: TicketSummary };
    return buildTicketPayload(ticket);
}

/**
 * Subscribes this backend to `ticket.created` events of the ticketing service.
 * Safe to call repeatedly; the ticketing service keeps subscriptions in memory, so we call it on boot.
 */
export async function registerTicketsWebhooks(dataSourceId: string, ticketsConfig: TicketsDataSourceConfig) {
    const webhook = await getOrCreateIncomingWebhook(dataSourceId);
    const webhookUrl = buildWebhookUrl(config.backendPublicUrl, webhook.id, webhook.token);

    const { webhooks } = await ticketsRequest<{ webhooks: TicketsWebhookSubscription[] }>(
        ticketsConfig,
        '/api/webhooks',
    );
    // Resubscribe instead of reusing a matching subscription, so the confirmation ping re-checks that the URL is reachable.
    for (const existing of webhooks.filter((subscription) => subscription.url === webhookUrl)) {
        await ticketsRequest<void>(ticketsConfig, `/api/webhooks/${encodeURIComponent(existing.id)}`, {
            method: 'DELETE',
        });
    }

    // Status must be written before subscribing: the ticketing service sends a ping right away.
    await updateIncomingWebhook(webhook.id, { externalId: null, status: 'PENDING_CONFIRMATION', lastError: null });
    const { webhook: subscription } = await ticketsRequest<{ webhook: TicketsWebhookSubscription }>(
        ticketsConfig,
        '/api/webhooks',
        {
            method: 'POST',
            body: JSON.stringify({ url: webhookUrl, events: ['ticket.created'], secret: webhook.signing_secret }),
        },
    );
    await updateIncomingWebhook(webhook.id, { externalId: subscription.id });
    await waitForWebhookConfirmation(webhook.id, 'Tickets');
}
