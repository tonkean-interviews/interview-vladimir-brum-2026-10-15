import { describe, expect, it } from 'vitest';
import { actionNode, edge, graph, triggerNode } from './graph-fixtures.test-utils';
import { topologicalOrder, validateGraphForPublish, validateGraphStructure } from './graph';

describe('validateGraphStructure', () => {
    it('accepts a trigger connected to an action', () => {
        expect(validateGraphStructure(graph([triggerNode(), actionNode('a')], [edge('trigger', 'a')]))).toEqual([]);
    });

    it('requires exactly one trigger', () => {
        expect(validateGraphStructure(graph([actionNode('a')], []))).toContain(
            'A module must have exactly one trigger, found 0',
        );
        expect(validateGraphStructure(graph([triggerNode(), triggerNode({ id: 'second' })], []))).toContain(
            'A module must have exactly one trigger, found 2',
        );
    });

    it('rejects edges to missing nodes', () => {
        const errors = validateGraphStructure(graph([triggerNode()], [edge('trigger', 'ghost')]));
        expect(errors).toEqual(['Edge "trigger->ghost" points to a node that does not exist']);
    });

    it('rejects edges into the trigger', () => {
        const errors = validateGraphStructure(graph([triggerNode(), actionNode('a')], [edge('a', 'trigger')]));
        expect(errors).toContain('Edge "a->trigger" points into the trigger');
    });

    it('rejects cycles', () => {
        const errors = validateGraphStructure(
            graph(
                [triggerNode(), actionNode('a'), actionNode('b')],
                [edge('trigger', 'a'), edge('a', 'b'), edge('b', 'a')],
            ),
        );
        expect(errors).toEqual(['The module graph contains a cycle']);
    });

    it('rejects node types without a definition', () => {
        const errors = validateGraphStructure(graph([triggerNode(), actionNode('a', { type: 'SEND_EMAIL' })], []));
        expect(errors).toEqual(['"a" has an unknown type "SEND_EMAIL"']);
    });

    it('rejects config that does not match the node type', () => {
        const errors = validateGraphStructure(graph([triggerNode(), actionNode('a', { config: { channel: 1 } })], []));
        expect(errors).toEqual(['"a" has an invalid configuration']);
    });
});

describe('validateGraphForPublish', () => {
    it('requires data sources and action config', () => {
        const errors = validateGraphForPublish(
            graph(
                [
                    triggerNode({ dataSourceId: null }),
                    actionNode('a', { config: { channel: ' ', messageTemplate: '' } }),
                ],
                [edge('trigger', 'a')],
            ),
        );
        expect(errors).toEqual(['"Trigger" has no data source', '"a" has no channel', '"a" has no message']);
    });
});

describe('topologicalOrder', () => {
    it('orders parents before children', () => {
        const order = topologicalOrder(
            graph(
                [actionNode('c'), actionNode('b'), triggerNode(), actionNode('a')],
                [edge('trigger', 'a'), edge('a', 'b'), edge('b', 'c')],
            ),
        ).map((node) => node.id);
        expect(order).toEqual(['trigger', 'a', 'b', 'c']);
    });
});
