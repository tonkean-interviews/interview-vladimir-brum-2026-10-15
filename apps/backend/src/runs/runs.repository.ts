import type { ModuleRun, RunStatus, RunStep, StepStatus } from '@tiny-tonkean/shared/runs';
import type { Selectable } from 'kysely';
import { db } from '../db/database';
import type { ModuleRunsTable } from '../db/types';
import { newId } from '../ids';

export async function createRun(input: {
    moduleId: string;
    externalActivityId: string | null;
    isTest: boolean;
    triggerPayload: Record<string, unknown>;
}): Promise<string> {
    const id = newId('RUN');
    await db
        .insertInto('module_runs')
        .values({
            id,
            module_id: input.moduleId,
            external_activity_id: input.externalActivityId,
            is_test: input.isTest ? 1 : 0,
            status: 'RUNNING',
            trigger_payload: JSON.stringify(input.triggerPayload),
        })
        .execute();
    return id;
}

export async function finishRun(runId: string, status: RunStatus, steps: RunStep[]): Promise<void> {
    await db.transaction().execute(async (trx) => {
        if (steps.length > 0) {
            await trx
                .insertInto('module_run_steps')
                .values(
                    steps.map((step) => ({
                        run_id: runId,
                        node_id: step.nodeId,
                        status: step.status,
                        output: step.output ? JSON.stringify(step.output) : null,
                        error: step.error,
                    })),
                )
                .execute();
        }
        await trx.updateTable('module_runs').set({ status, finished_at: new Date() }).where('id', '=', runId).execute();
    });
}

export async function listRuns(moduleId: string, limit = 20): Promise<ModuleRun[]> {
    const runs = await db
        .selectFrom('module_runs')
        .selectAll()
        .where('module_id', '=', moduleId)
        .orderBy('started_at', 'desc')
        .limit(limit)
        .execute();
    return withSteps(runs);
}

export async function findRun(runId: string): Promise<ModuleRun | undefined> {
    const runs = await db.selectFrom('module_runs').selectAll().where('id', '=', runId).execute();
    const [run] = await withSteps(runs);
    return run;
}

async function withSteps(runs: Selectable<ModuleRunsTable>[]): Promise<ModuleRun[]> {
    if (runs.length === 0) {
        return [];
    }

    const steps = await db
        .selectFrom('module_run_steps')
        .selectAll()
        .where(
            'run_id',
            'in',
            runs.map((run) => run.id),
        )
        .orderBy('id')
        .execute();

    return runs.map((run) => ({
        id: run.id,
        moduleId: run.module_id,
        externalActivityId: run.external_activity_id,
        isTest: run.is_test === 1,
        status: run.status as RunStatus,
        triggerPayload: run.trigger_payload,
        startedAt: run.started_at.toISOString(),
        finishedAt: run.finished_at?.toISOString() ?? null,
        steps: steps
            .filter((step) => step.run_id === run.id)
            .map((step) => ({
                nodeId: step.node_id,
                status: step.status as StepStatus,
                output: step.output,
                error: step.error,
            })),
    }));
}
