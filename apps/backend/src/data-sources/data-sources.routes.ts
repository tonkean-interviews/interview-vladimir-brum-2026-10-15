import { dataSourceInputSchema } from '@tiny-tonkean/shared/data-sources';
import type { FastifyInstance } from 'fastify';
import { listChatterChannels } from '../integrations/chatter.integration';
import { registerForWebhooks, testConnection } from '../integrations/integrations';
import { listTickets } from '../integrations/tickets.integration';
import { getWebhookSummary } from '../webhooks/incoming-webhooks.repository';
import {
    createDataSource,
    deleteDataSource,
    findDataSource,
    listDataSources,
    updateDataSource,
} from './data-sources.repository';

type IdParams = { Params: { id: string } };

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export async function registerDataSourceRoutes(app: FastifyInstance): Promise<void> {
    app.get('/data-sources', async () => listDataSources());

    app.get<IdParams>('/data-sources/:id', async (request, reply) => {
        const dataSource = await findDataSource(request.params.id);
        return dataSource ?? reply.code(404).send({ error: 'Data source not found' });
    });

    app.post('/data-sources', async (request, reply) => {
        const parsed = dataSourceInputSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Invalid data source', details: parsed.error.issues });
        }
        const dataSource = await createDataSource(parsed.data);
        await registerForWebhooks(dataSource).catch((error: unknown) =>
            request.log.warn({ err: error }, 'Webhook registration failed'),
        );
        return reply.code(201).send(dataSource);
    });

    app.put<IdParams>('/data-sources/:id', async (request, reply) => {
        const parsed = dataSourceInputSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Invalid data source', details: parsed.error.issues });
        }
        const dataSource = await updateDataSource(request.params.id, parsed.data);
        if (!dataSource) {
            return reply.code(404).send({ error: 'Data source not found' });
        }
        await registerForWebhooks(dataSource).catch((error: unknown) =>
            request.log.warn({ err: error }, 'Webhook registration failed'),
        );
        return dataSource;
    });

    app.delete<IdParams>('/data-sources/:id', async (request, reply) => {
        await deleteDataSource(request.params.id);
        return reply.code(204).send();
    });

    app.post<IdParams>('/data-sources/:id/test-connection', async (request, reply) => {
        const dataSource = await findDataSource(request.params.id);
        if (!dataSource) {
            return reply.code(404).send({ error: 'Data source not found' });
        }
        try {
            await testConnection(dataSource);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: errorMessage(error) };
        }
    });

    app.get<IdParams>('/data-sources/:id/webhook', async (request, reply) => {
        const summary = await getWebhookSummary(request.params.id);
        return summary ?? reply.code(404).send({ error: 'This data source has no webhook' });
    });

    app.post<IdParams>('/data-sources/:id/webhook/register', async (request, reply) => {
        const dataSource = await findDataSource(request.params.id);
        if (!dataSource) {
            return reply.code(404).send({ error: 'Data source not found' });
        }
        try {
            await registerForWebhooks(dataSource);
        } catch (error) {
            return reply.code(502).send({ error: errorMessage(error) });
        }
        return getWebhookSummary(dataSource.id);
    });

    app.get<IdParams>('/data-sources/:id/tickets', async (request, reply) => {
        const dataSource = await findDataSource(request.params.id);
        if (dataSource?.type !== 'TICKETS') {
            return reply.code(404).send({ error: 'Tickets data source not found' });
        }
        return listTickets(dataSource.config);
    });

    app.get<IdParams>('/data-sources/:id/channels', async (request, reply) => {
        const dataSource = await findDataSource(request.params.id);
        if (dataSource?.type !== 'CHATTER') {
            return reply.code(404).send({ error: 'Chatter data source not found' });
        }
        return listChatterChannels(dataSource.config);
    });
}
