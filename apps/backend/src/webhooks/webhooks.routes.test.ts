import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { IncomingWebhook } from './incoming-webhooks.repository';
import { encodeWebhookSecret } from './webhook-secret';
import { registerWebhookRoutes, type WebhookRouteDeps } from './webhooks.routes';

const SUBSCRIPTION_ID = 'WH_1';
const SIGNING_SECRET = 'signing-secret';

const webhook: IncomingWebhook = {
    id: 'IW_1',
    data_source_id: 'DS_tickets',
    token: 'secret-token',
    signing_secret: SIGNING_SECRET,
    external_id: SUBSCRIPTION_ID,
    status: 'PENDING_CONFIRMATION',
    last_error: null,
    created_at: new Date(),
    updated_at: new Date(),
};

function sign(body: string, secret = SIGNING_SECRET): string {
    return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

async function setup() {
    const deps = {
        findIncomingWebhook: vi.fn(async (id: string) => (id === webhook.id ? webhook : undefined)),
        saveWebhookPayload: vi.fn(async () => {}),
        markWebhookConfirmed: vi.fn(async () => {}),
        enqueueNotification: vi.fn(),
    } satisfies WebhookRouteDeps;
    const app = Fastify();
    await registerWebhookRoutes(app, deps);

    const post = (secret: string, eventName: string, body: string, signature = sign(body)) =>
        app.inject({
            method: 'POST',
            url: `/webhooks/incoming/${secret}`,
            headers: {
                'content-type': 'application/json',
                'x-tickets-event': eventName,
                'x-tickets-signature': signature,
            },
            payload: body,
        });

    return { deps, post };
}

describe('POST /webhooks/incoming/:secret', () => {
    const validSecret = encodeWebhookSecret('IW_1', 'secret-token');

    it('rejects an unknown or wrong secret', async () => {
        const { deps, post } = await setup();
        expect((await post(encodeWebhookSecret('IW_1', 'wrong'), 'webhook.ping', '{}')).statusCode).toBe(401);
        expect((await post(encodeWebhookSecret('IW_2', 'secret-token'), 'webhook.ping', '{}')).statusCode).toBe(401);
        expect((await post('not-a-secret', 'webhook.ping', '{}')).statusCode).toBe(401);
        expect(deps.saveWebhookPayload).not.toHaveBeenCalled();
    });

    it('rejects a missing or wrong signature', async () => {
        const { deps, post } = await setup();
        const body = JSON.stringify({ event: 'webhook.ping', subscriptionId: SUBSCRIPTION_ID });
        expect((await post(validSecret, 'webhook.ping', body, sign(body, 'other-secret'))).statusCode).toBe(401);
        expect((await post(validSecret, 'webhook.ping', body, '')).statusCode).toBe(401);
        expect(deps.saveWebhookPayload).not.toHaveBeenCalled();
    });

    it('confirms the webhook on ping', async () => {
        const { deps, post } = await setup();
        const response = await post(
            validSecret,
            'webhook.ping',
            JSON.stringify({ event: 'webhook.ping', subscriptionId: SUBSCRIPTION_ID, data: {} }),
        );

        expect(response.statusCode).toBe(200);
        expect(deps.markWebhookConfirmed).toHaveBeenCalledWith('IW_1');
        expect(deps.enqueueNotification).not.toHaveBeenCalled();
    });

    it('stores and enqueues new tickets without handling them inline', async () => {
        const { deps, post } = await setup();
        const body = JSON.stringify({
            event: 'ticket.created',
            subscriptionId: SUBSCRIPTION_ID,
            data: { ticket: { id: 'TCK-1' } },
        });
        const response = await post(validSecret, 'ticket.created', body);

        expect(response.statusCode).toBe(200);
        expect(deps.saveWebhookPayload).toHaveBeenCalledWith('IW_1', 'ticket.created', body);
        expect(deps.enqueueNotification).toHaveBeenCalledWith({ dataSourceId: 'DS_tickets', message: body });
    });

    it('rejects events of an unexpected subscription', async () => {
        const { deps, post } = await setup();
        const body = JSON.stringify({ event: 'ticket.created', subscriptionId: 'WH_other', data: {} });
        const response = await post(validSecret, 'ticket.created', body);

        expect(response.statusCode).toBe(403);
        expect(deps.enqueueNotification).not.toHaveBeenCalled();
    });
});
