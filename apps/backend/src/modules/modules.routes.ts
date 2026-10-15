import { saveModuleSchema } from '@tiny-tonkean/shared/module-graph';
import { testRunInputSchema } from '@tiny-tonkean/shared/runs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { findDataSource } from '../data-sources/data-sources.repository';
import { findTriggerNode, validateGraphForPublish, validateGraphStructure } from '../engine/graph';
import { runModule } from '../engine/run-module';
import { buildTicketPayload } from '../integrations/tickets-webhook-parser';
import { getTicketPayload, TicketNotFoundError } from '../integrations/tickets.integration';
import { findRun, listRuns } from '../runs/runs.repository';
import {
    createModule,
    deleteModule,
    findModule,
    listModules,
    saveModule,
    setModulePublished,
} from './modules.repository';

type IdParams = { Params: { id: string } };

export async function registerModuleRoutes(app: FastifyInstance): Promise<void> {
    app.get('/modules', async () => listModules());

    app.post('/modules', async (request, reply) => {
        const parsed = z.object({ name: z.string().min(1) }).safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Module name is required' });
        }
        return reply.code(201).send(await createModule(parsed.data.name, request.user.userId));
    });

    app.get<IdParams>('/modules/:id', async (request, reply) => {
        const module = await findModule(request.params.id);
        return module ?? reply.code(404).send({ error: 'Module not found' });
    });

    app.put<IdParams>('/modules/:id', async (request, reply) => {
        const parsed = saveModuleSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .code(400)
                .send({ error: 'Invalid module', details: parsed.error.issues.map((i) => i.message) });
        }
        const existing = await findModule(request.params.id);
        if (!existing) {
            return reply.code(404).send({ error: 'Module not found' });
        }

        const graph = { nodes: parsed.data.nodes, edges: parsed.data.edges };
        const errors = existing.isPublished ? validateGraphForPublish(graph) : validateGraphStructure(graph);
        if (errors.length > 0) {
            return reply.code(400).send({ error: 'Module is not valid', details: errors });
        }

        await saveModule(request.params.id, parsed.data.name, graph);
        return findModule(request.params.id);
    });

    app.post<IdParams>('/modules/:id/publish', async (request, reply) => {
        const parsed = z.object({ isPublished: z.boolean() }).safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'isPublished is required' });
        }
        const module = await findModule(request.params.id);
        if (!module) {
            return reply.code(404).send({ error: 'Module not found' });
        }
        if (parsed.data.isPublished) {
            const errors = validateGraphForPublish(module);
            if (errors.length > 0) {
                return reply.code(400).send({ error: 'Module cannot be published', details: errors });
            }
        }
        await setModulePublished(module.id, parsed.data.isPublished);
        return findModule(module.id);
    });

    app.delete<IdParams>('/modules/:id', async (request, reply) => {
        await deleteModule(request.params.id);
        return reply.code(204).send();
    });

    app.get<IdParams>('/modules/:id/runs', async (request) => listRuns(request.params.id));

    /** Runs the saved graph with a real or fake trigger payload, without going through the webhook. */
    app.post<IdParams>('/modules/:id/test', async (request, reply) => {
        const parsed = testRunInputSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Provide either ticketId or title' });
        }
        const module = await findModule(request.params.id);
        if (!module) {
            return reply.code(404).send({ error: 'Module not found' });
        }
        const trigger = findTriggerNode(module);
        const dataSource = trigger?.dataSourceId ? await findDataSource(trigger.dataSourceId) : undefined;
        if (!trigger || dataSource?.type !== 'TICKETS') {
            return reply.code(400).send({ error: 'The trigger needs a Tickets data source before it can be tested' });
        }

        let triggerPayload: Record<string, unknown>;
        if ('ticketId' in parsed.data) {
            try {
                triggerPayload = await getTicketPayload(dataSource.config, parsed.data.ticketId);
            } catch (error) {
                if (error instanceof TicketNotFoundError) {
                    return reply.code(400).send({ error: error.message });
                }
                throw error;
            }
        } else {
            triggerPayload = buildTicketPayload({
                id: 'TCK-TEST',
                title: parsed.data.title,
                description: 'Sample ticket created by a test run',
                priority: 'MEDIUM',
                reporter: 'test@tonkean.com',
                createdAt: new Date().toISOString(),
            });
        }

        const runId = await runModule({
            moduleId: module.id,
            triggerPayload,
            isTest: true,
            externalActivityId: null,
        });
        return findRun(runId);
    });
}
