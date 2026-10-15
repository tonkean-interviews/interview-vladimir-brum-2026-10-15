import type { ActionNode, ModuleGraph, NodeConfig } from '@tiny-tonkean/shared/module-graph';
import type { RunStep } from '@tiny-tonkean/shared/runs';
import { findTriggerNode, parentIds, topologicalOrder } from './graph';
import { renderTemplate } from './template';

export type ActionExecutor = (node: ActionNode, renderedConfig: NodeConfig) => Promise<Record<string, unknown>>;

/**
 * Runs every node reachable from the trigger in topological order. A node runs only when all of its
 * parents succeeded; otherwise it is skipped, so one failure never stops unrelated branches.
 */
export async function executeGraph(
    graph: ModuleGraph,
    triggerPayload: Record<string, unknown>,
    executeAction: ActionExecutor,
): Promise<RunStep[]> {
    const trigger = findTriggerNode(graph);
    if (!trigger) {
        throw new Error('Module has no trigger');
    }

    const steps = new Map<string, RunStep>();
    const outputs: Record<string, Record<string, unknown>> = {};
    steps.set(trigger.id, { nodeId: trigger.id, status: 'SUCCESS', output: triggerPayload, error: null });
    outputs[trigger.id] = triggerPayload;

    const reachable = reachableFrom(graph, trigger.id);

    for (const node of topologicalOrder(graph)) {
        if (node.kind !== 'ACTION' || !reachable.has(node.id)) {
            continue;
        }
        const parents = parentIds(graph, node.id).filter((parentId) => reachable.has(parentId));
        if (parents.some((parentId) => steps.get(parentId)?.status !== 'SUCCESS')) {
            steps.set(node.id, { nodeId: node.id, status: 'SKIPPED', output: null, error: null });
            continue;
        }

        const context = { trigger: triggerPayload, nodes: outputs };
        const renderedConfig = Object.fromEntries(
            Object.entries(node.config).map(([key, value]) => [
                key,
                typeof value === 'string' ? renderTemplate(value, context) : value,
            ]),
        );

        try {
            const output = await executeAction(node, renderedConfig);
            outputs[node.id] = output;
            steps.set(node.id, { nodeId: node.id, status: 'SUCCESS', output, error: null });
        } catch (error) {
            steps.set(node.id, {
                nodeId: node.id,
                status: 'FAILED',
                output: null,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return [...steps.values()];
}

function reachableFrom(graph: ModuleGraph, startId: string): Set<string> {
    const reachable = new Set([startId]);
    const queue = [startId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const edge of graph.edges) {
            if (edge.source === current && !reachable.has(edge.target)) {
                reachable.add(edge.target);
                queue.push(edge.target);
            }
        }
    }
    return reachable;
}
