import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { ErrorLog } from './error-log';
import { PRIORITIES, type Priority, TicketStore } from './store';
import { WEBHOOK_EVENTS, WebhookRegistry } from './webhooks';

const port = Number(process.env.PORT ?? 4200);
const apiToken = process.env.TICKETS_API_TOKEN ?? 'tickets-dev-token';
const webRoot = fileURLToPath(new URL('../../dist/web', import.meta.url));

const errorLog = new ErrorLog();
const app = Fastify({ logger: { level: 'info', stream: errorLog.stream() } });
const store = new TicketStore();
const webhooks = new WebhookRegistry(app.log);

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/** Integrations (webhook management) need the API token; the tickets UI does not. */
async function requireApiToken(request: FastifyRequest, reply: FastifyReply) {
    if (request.headers.authorization !== `Bearer ${apiToken}`) {
        return reply.code(401).send({ error: 'Invalid API token' });
    }
}

app.get('/api/tickets', async () => ({ tickets: store.list() }));

app.get<{ Params: { id: string } }>('/api/tickets/:id', async (request, reply) => {
    const ticket = store.find(request.params.id);
    return ticket ? { ticket } : reply.code(404).send({ error: `Ticket "${request.params.id}" not found` });
});

app.post<{ Body: Record<string, unknown> | undefined }>('/api/tickets', async (request, reply) => {
    const { title, description, priority, reporter } = request.body ?? {};
    if (!isNonEmptyString(title) || !isNonEmptyString(reporter)) {
        return reply.code(400).send({ error: 'title and reporter are required' });
    }
    if (!PRIORITIES.includes(priority as Priority)) {
        return reply.code(400).send({ error: `priority must be one of ${PRIORITIES.join(', ')}` });
    }
    const ticket = store.create({
        title: title.trim(),
        description: typeof description === 'string' ? description : '',
        priority: priority as Priority,
        reporter: reporter.trim(),
    });
    webhooks.publish('ticket.created', { ticket });
    return reply.code(201).send({ ticket });
});

app.register(async (integrationApi) => {
    integrationApi.addHook('preHandler', requireApiToken);

    integrationApi.get('/api/logs/errors', async () => ({ errors: errorLog.list() }));

    integrationApi.get('/api/webhooks', async () => ({
        webhooks: webhooks.list().map(({ secret: _secret, ...subscription }) => subscription),
    }));

    integrationApi.post<{ Body: Record<string, unknown> | undefined }>('/api/webhooks', async (request, reply) => {
        const { url, events, secret } = request.body ?? {};
        if (!isNonEmptyString(url)) {
            return reply.code(400).send({ error: 'url is required' });
        }
        if (!Array.isArray(events) || events.length === 0 || !events.every((event) => WEBHOOK_EVENTS.includes(event))) {
            return reply.code(400).send({ error: `events must be a non-empty list of: ${WEBHOOK_EVENTS.join(', ')}` });
        }
        const { secret: _secret, ...subscription } = webhooks.subscribe(
            url,
            events as string[],
            isNonEmptyString(secret) ? secret : null,
        );
        return reply.code(201).send({ webhook: subscription });
    });

    integrationApi.delete<{ Params: { id: string } }>('/api/webhooks/:id', async (request, reply) => {
        return webhooks.unsubscribe(request.params.id)
            ? reply.code(204).send()
            : reply.code(404).send({ error: 'Webhook not found' });
    });
});

if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot });
} else {
    app.log.warn(`No built UI at ${webRoot}; run "pnpm build" to serve it`);
}

await app.listen({ port, host: '0.0.0.0' });
