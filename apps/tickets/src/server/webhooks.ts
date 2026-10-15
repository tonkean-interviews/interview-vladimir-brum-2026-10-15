import { createHmac, randomUUID } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';

export const WEBHOOK_EVENTS = ['ticket.created'] as const;
export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number] | 'webhook.ping';

export interface WebhookSubscription {
    id: string;
    url: string;
    events: string[];
    secret: string | null;
    createdAt: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const NETWORK_ERRORS: Record<string, string> = {
    ECONNREFUSED: 'connection refused',
    ENOTFOUND: 'host not found',
    ETIMEDOUT: 'connection timed out',
    ECONNRESET: 'connection reset',
};

function describeFailure(error: unknown): string {
    if (!(error instanceof Error)) {
        return 'request failed';
    }
    const cause = error.cause;
    const code = cause instanceof Error ? (cause as NodeJS.ErrnoException).code : undefined;
    if (code) {
        return NETWORK_ERRORS[code] ? `${NETWORK_ERRORS[code]} (${code})` : code;
    }
    if (cause instanceof Error && cause.message) {
        return `${error.message}: ${cause.message}`;
    }
    return error.message;
}

/** The last path segment of a webhook URL is usually its secret, so keep it out of logs. */
function redactUrl(url: string): string {
    const lastSlash = url.lastIndexOf('/');
    return lastSlash > url.indexOf('//') + 1 ? `${url.slice(0, lastSlash)}/...` : url;
}

export function signBody(secret: string, body: string): string {
    return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/**
 * Keeps webhook subscriptions in memory and delivers events to them, like the webhooks of Zendesk or GitHub:
 * a JSON POST signed with the subscription's secret, retried a few times on failure.
 */
export class WebhookRegistry {
    private readonly subscriptions = new Map<string, WebhookSubscription>();

    constructor(private readonly logger: FastifyBaseLogger) {}

    list(): WebhookSubscription[] {
        return [...this.subscriptions.values()];
    }

    subscribe(url: string, events: string[], secret: string | null): WebhookSubscription {
        const subscription = { id: `WH_${randomUUID()}`, url, events, secret, createdAt: new Date().toISOString() };
        this.subscriptions.set(subscription.id, subscription);
        // Lets the subscriber verify that it can receive events.
        setImmediate(() => void this.deliver(subscription, 'webhook.ping', {}));
        return subscription;
    }

    unsubscribe(id: string): boolean {
        return this.subscriptions.delete(id);
    }

    publish(event: (typeof WEBHOOK_EVENTS)[number], data: Record<string, unknown>): void {
        for (const subscription of this.subscriptions.values()) {
            if (subscription.events.includes(event)) {
                void this.deliver(subscription, event, data);
            }
        }
    }

    private async deliver(
        subscription: WebhookSubscription,
        event: WebhookEventName,
        data: Record<string, unknown>,
    ): Promise<void> {
        const deliveryId = randomUUID();
        const body = JSON.stringify({
            id: deliveryId,
            event,
            subscriptionId: subscription.id,
            occurredAt: new Date().toISOString(),
            data,
        });
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Tickets-Event': event,
            'X-Tickets-Delivery': deliveryId,
        };
        if (subscription.secret) {
            headers['X-Tickets-Signature'] = signBody(subscription.secret, body);
        }

        let lastFailure = 'no attempt was made';
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const response = await fetch(subscription.url, { method: 'POST', headers, body });
                if (response.ok) {
                    this.logger.info({ event, deliveryId, url: subscription.url }, 'Webhook delivered');
                    return;
                }
                lastFailure = `the webhook URL responded with HTTP ${response.status}`;
                this.logger.warn({ event, deliveryId, status: response.status, attempt }, 'Webhook rejected');
            } catch (error) {
                lastFailure = describeFailure(error);
                this.logger.warn({ event, deliveryId, err: error, attempt }, 'Webhook delivery failed');
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
        const url = redactUrl(subscription.url);
        this.logger.error(
            { event, deliveryId, url, attempts: MAX_ATTEMPTS, reason: lastFailure },
            `Tickets failed to send the ${event} message to the webhook URL ${url} after ${MAX_ATTEMPTS} attempts: ${lastFailure}`,
        );
    }
}
