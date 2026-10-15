import type { RunStatus } from '@tiny-tonkean/shared/runs';
import { executeAction } from '../integrations/integrations';
import { loadModuleGraph } from '../modules/modules.repository';
import { createRun, finishRun } from '../runs/runs.repository';
import { executeGraph } from './execute-graph';

export async function runModule(input: {
    moduleId: string;
    triggerPayload: Record<string, unknown>;
    isTest: boolean;
    externalActivityId: string | null;
}): Promise<string> {
    const graph = await loadModuleGraph(input.moduleId);
    const runId = await createRun(input);

    try {
        const steps = await executeGraph(graph, input.triggerPayload, executeAction);
        const status: RunStatus = steps.some((step) => step.status === 'FAILED') ? 'FAILED' : 'SUCCESS';
        await finishRun(runId, status, steps);
    } catch (error) {
        await finishRun(runId, 'FAILED', []);
        throw error;
    }

    return runId;
}
