import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { ChatterStore } from './store';

const port = Number(process.env.PORT ?? 4100);
const apiToken = process.env.CHATTER_API_TOKEN ?? 'chatter-dev-token';
const webRoot = fileURLToPath(new URL('../../dist/web', import.meta.url));

const app = Fastify({ logger: true });
const store = new ChatterStore();

app.get('/api/channels', async () => ({ channels: store.listChannels().map((name) => ({ name })) }));

app.get<{ Params: { channel: string } }>('/api/channels/:channel/messages', async (request, reply) => {
    const messages = store.listMessages(request.params.channel);
    return messages ? { messages } : reply.code(404).send({ error: `Channel "${request.params.channel}" not found` });
});

app.post<{ Params: { channel: string }; Body: { text?: unknown; author?: unknown } }>(
    '/api/channels/:channel/messages',
    async (request, reply) => {
        if (request.headers.authorization !== `Bearer ${apiToken}`) {
            return reply.code(401).send({ error: 'Invalid API token' });
        }
        const { text, author } = request.body ?? {};
        if (typeof text !== 'string' || !text.trim()) {
            return reply.code(400).send({ error: 'text is required' });
        }
        const message = store.post(request.params.channel, typeof author === 'string' ? author : 'API', text);
        if (!message) {
            return reply.code(404).send({ error: `Channel "${request.params.channel}" not found` });
        }
        return reply.code(201).send({ message });
    },
);

if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot });
} else {
    app.log.warn(`No built UI at ${webRoot}; run "pnpm build" to serve it`);
}

await app.listen({ port, host: '0.0.0.0' });
