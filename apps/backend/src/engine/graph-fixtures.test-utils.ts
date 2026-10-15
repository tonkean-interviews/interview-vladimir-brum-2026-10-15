import type { ActionNode, ModuleEdge, ModuleGraph, TriggerNode } from '@tiny-tonkean/shared/module-graph';

export function triggerNode(overrides: Partial<TriggerNode> = {}): TriggerNode {
    return {
        id: 'trigger',
        kind: 'TRIGGER',
        type: 'TICKET_CREATED',
        label: 'Trigger',
        dataSourceId: 'DS_tickets',
        config: {},
        position: { x: 0, y: 0 },
        ...overrides,
    };
}

export function actionNode(id: string, overrides: Partial<ActionNode> = {}): ActionNode {
    return {
        id,
        kind: 'ACTION',
        type: 'CHATTER_POST_MESSAGE',
        label: id,
        dataSourceId: 'DS_chatter',
        config: { channel: 'new_tickets', messageTemplate: `${id}: {{trigger.title}}` },
        position: { x: 0, y: 0 },
        ...overrides,
    };
}

export function edge(source: string, target: string): ModuleEdge {
    return { id: `${source}->${target}`, source, target };
}

export function graph(nodes: ModuleGraph['nodes'], edges: ModuleEdge[]): ModuleGraph {
    return { nodes, edges };
}
