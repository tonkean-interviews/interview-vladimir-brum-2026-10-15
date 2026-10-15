import type { ModuleGraph } from '@tiny-tonkean/shared/module-graph';
import { describe, expect, it } from 'vitest';
import { fromFlow, toFlow } from './graph-mapping';

const graph: ModuleGraph = {
    nodes: [
        {
            id: 'trigger',
            kind: 'TRIGGER',
            type: 'TICKET_CREATED',
            label: 'Trigger',
            dataSourceId: 'DS_tickets',
            config: {},
            position: { x: 10, y: 20 },
        },
        {
            id: 'post',
            kind: 'ACTION',
            type: 'CHATTER_POST_MESSAGE',
            label: 'Post',
            dataSourceId: 'DS_chatter',
            config: { channel: 'new_tickets', messageTemplate: 'Hi {{trigger.title}}' },
            position: { x: 300, y: 20 },
        },
    ],
    edges: [{ id: 'trigger->post', source: 'trigger', target: 'post' }],
};

describe('graph mapping', () => {
    it('round-trips a module graph through React Flow nodes and edges', () => {
        const { nodes, edges } = toFlow(graph);
        expect(fromFlow(nodes, edges)).toEqual(graph);
    });

    it('makes the trigger node undeletable', () => {
        const { nodes } = toFlow(graph);
        expect(nodes.find((node) => node.id === 'trigger')?.deletable).toBe(false);
        expect(nodes.find((node) => node.id === 'post')?.deletable).toBeUndefined();
    });
});
