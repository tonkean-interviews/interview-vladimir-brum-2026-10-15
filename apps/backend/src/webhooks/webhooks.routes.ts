import type { FastifyInstance } from 'fastify';
import type { TicketsWebhookEvent } from '../integrations/tickets-webhook-parser';
import type { IncomingWebhook } from './incoming-webhooks.repository';
import type { WebhookNotificationEvent } from './webhook-handler';
import { decodeWebhookSecret, signatureMatches, tokensMatch } from './webhook-secret';

export interface WebhookRouteDeps {
    findIncomingWebhook: (id: string) => Promise<IncomingWebhook | undefined>;
    saveWebhookPayload: (webhookId: string, messageType: string, rawBody: string) => Promise<void>;
    markWebhookConfirmed: (webhookId: string) => Promise<void>;
    enqueueNotification: (event: WebhookNotificationEvent) => void;
}

export async function registerWebhookRoutes(app: FastifyInstance, deps: WebhookRouteDeps): Promise<void> {
    await app.register(async (webhookApi) => {
        // The signature is computed over the exact bytes that were sent, so keep the body as a string.
        webhookApi.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) =>
            done(null, body),
        );

        webhookApi.post<{ Params: { secret: string } }>('/webhooks/incoming/:secret', async (request, reply) => {
            const decoded = decodeWebhookSecret(request.params.secret);
            const webhook = decoded ? await deps.findIncomingWebhook(decoded.webhookId) : undefined;
            if (!decoded || !webhook || !tokensMatch(webhook.token, decoded.token)) {
                return reply.code(401).send({ error: 'Invalid webhook secret' });
            }

            const rawBody = typeof request.body === 'string' ? request.body : '';
            const signature = request.headers['x-tickets-signature'];
            if (
                !signatureMatches(
                    webhook.signing_secret,
                    rawBody,
                    typeof signature === 'string' ? signature : undefined,
                )
            ) {
                return reply.code(401).send({ error: 'Invalid signature' });
            }

            let event: TicketsWebhookEvent;
            try {
                event = JSON.parse(rawBody) as TicketsWebhookEvent;
            } catch {
                return reply.code(400).send({ error: 'Body is not valid JSON' });
            }

            const messageType = String(request.headers['x-tickets-event'] ?? event.event ?? 'unknown');
            await deps.saveWebhookPayload(webhook.id, messageType, rawBody);

            if (event.subscriptionId && webhook.external_id && event.subscriptionId !== webhook.external_id) {
                return reply.code(403).send({ error: 'Unexpected subscription' });
            }

            switch (messageType) {
                case 'webhook.ping':
                    await deps.markWebhookConfirmed(webhook.id);
                    break;
                case 'ticket.created':
                    deps.enqueueNotification({ dataSourceId: webhook.data_source_id, message: rawBody });
                    break;
                default:
                    break;
            }

            return reply.code(200).send({ ok: true });
        });
    });
}
