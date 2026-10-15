import { describe, expect, it, vi } from 'vitest';
import { type ActionExecutor, executeGraph } from './execute-graph';
import { actionNode, edge, graph, triggerNode } from './graph-fixtures.test-utils';

const payload = { id: 'TCK-1', title: 'VPN is down' };

function echoExecutor(): ActionExecutor & { calls: string[] } {
    const calls: string[] = [];
    const executor = vi.fn<ActionExecutor>(async (node, renderedConfig) => {
        calls.push(node.id);
        return { messageId: `msg-${node.id}`, text: renderedConfig.messageTemplate };
    });
    return Object.assign(executor, { calls });
}

describe('executeGraph', () => {
    it('records the trigger step and runs connected actions with rendered templates', async () => {
        const executor = echoExecutor();
        const steps = await executeGraph(
            graph([triggerNode(), actionNode('a')], [edge('trigger', 'a')]),
            payload,
            executor,
        );

        expect(steps).toEqual([
            { nodeId: 'trigger', status: 'SUCCESS', output: payload, error: null },
            { nodeId: 'a', status: 'SUCCESS', output: { messageId: 'msg-a', text: 'a: VPN is down' }, error: null },
        ]);
    });

    it('runs every branch of a fan-out', async () => {
        const executor = echoExecutor();
        await executeGraph(
            graph([triggerNode(), actionNode('a'), actionNode('b')], [edge('trigger', 'a'), edge('trigger', 'b')]),
            payload,
            executor,
        );
        expect(executor.calls.sort()).toEqual(['a', 'b']);
    });

    it('lets later nodes use the output of earlier nodes', async () => {
        const executor = echoExecutor();
        const steps = await executeGraph(
            graph(
                [
                    triggerNode(),
                    actionNode('a'),
                    actionNode('b', { config: { channel: 'x', messageTemplate: 'after {{nodes.a.messageId}}' } }),
                ],
                [edge('trigger', 'a'), edge('a', 'b')],
            ),
            payload,
            executor,
        );
        expect(steps.find((step) => step.nodeId === 'b')?.output).toEqual({ messageId: 'msg-b', text: 'after msg-a' });
    });

    it('skips only the descendants of a failed node', async () => {
        const executor: ActionExecutor = async (node) => {
            if (node.id === 'a') {
                throw new Error('boom');
            }
            return {};
        };
        const steps = await executeGraph(
            graph(
                [triggerNode(), actionNode('a'), actionNode('a-child'), actionNode('b')],
                [edge('trigger', 'a'), edge('a', 'a-child'), edge('trigger', 'b')],
            ),
            payload,
            executor,
        );

        const statusById = Object.fromEntries(steps.map((step) => [step.nodeId, step.status]));
        expect(statusById).toEqual({ trigger: 'SUCCESS', a: 'FAILED', 'a-child': 'SKIPPED', b: 'SUCCESS' });
        expect(steps.find((step) => step.nodeId === 'a')?.error).toBe('boom');
    });

    it('ignores actions that are not connected to the trigger', async () => {
        const executor = echoExecutor();
        const steps = await executeGraph(
            graph([triggerNode(), actionNode('orphan'), actionNode('orphan-child')], [edge('orphan', 'orphan-child')]),
            payload,
            executor,
        );
        expect(steps.map((step) => step.nodeId)).toEqual(['trigger']);
        expect(executor.calls).toEqual([]);
    });
});
