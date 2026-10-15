import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import { AUTH_COOKIE, registerAuthRoutes, requireAuth } from './auth/auth.routes';
import { config } from './config';
import { registerDataSourceRoutes } from './data-sources/data-sources.routes';
import { registerModuleRoutes } from './modules/modules.routes';
import { EventQueue } from './webhooks/event-queue';
import {
    findIncomingWebhook,
    saveWebhookPayload,
    updateIncomingWebhook,
} from './webhooks/incoming-webhooks.repository';
import { handleWebhookNotification, type WebhookNotificationEvent } from './webhooks/webhook-handler';
import { registerWebhookRoutes } from './webhooks/webhooks.routes';

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

    await app.register(cookie);
    await app.register(jwt, { secret: config.jwtSecret, cookie: { cookieName: AUTH_COOKIE, signed: false } });

    const notificationQueue = new EventQueue<WebhookNotificationEvent>(handleWebhookNotification, app.log);

    // Public: called by external systems, authenticated by the secret in the URL.
    await registerWebhookRoutes(app, {
        findIncomingWebhook,
        saveWebhookPayload,
        markWebhookConfirmed: (webhookId) => updateIncomingWebhook(webhookId, { status: 'CONFIRMED', lastError: null }),
        enqueueNotification: (event) => notificationQueue.enqueue(event),
    });

    await app.register(
        async (api) => {
            await registerAuthRoutes(api);
            await api.register(async (protectedApi) => {
                protectedApi.addHook('preHandler', requireAuth);
                await registerDataSourceRoutes(protectedApi);
                await registerModuleRoutes(protectedApi);
            });
        },
        { prefix: '/api' },
    );

    return app;
}
