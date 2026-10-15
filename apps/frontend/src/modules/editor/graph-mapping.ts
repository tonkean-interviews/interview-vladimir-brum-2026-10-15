import type { ActionNode, ModuleGraph, TriggerNode } from '@tiny-tonkean/shared/module-graph';
import type { StepStatus } from '@tiny-tonkean/shared/runs';
import type { Edge, Node } from '@xyflow/react';

type WithoutPosition<T> = Omit<T, 'position'>;

export type TriggerFlowNode = Node<{ node: WithoutPosition<TriggerNode>; runStatus?: StepStatus }, 'trigger'>;
export type ActionFlowNode = Node<{ node: WithoutPosition<ActionNode>; runStatus?: StepStatus }, 'action'>;
export type FlowNode = TriggerFlowNode | ActionFlowNode;

export function toFlow(graph: ModuleGraph): { nodes: FlowNode[]; edges: Edge[] } {
    const nodes = graph.nodes.map((moduleNode): FlowNode => {
        const { position, ...node } = moduleNode;
        return node.kind === 'TRIGGER'
            ? { id: node.id, type: 'trigger', position, data: { node }, deletable: false }
            : { id: node.id, type: 'action', position, data: { node: node as WithoutPosition<ActionNode> } };
    });
    const edges = graph.edges.map((edge): Edge => ({ id: edge.id, source: edge.source, target: edge.target }));
    return { nodes, edges };
}

export function fromFlow(nodes: FlowNode[], edges: Edge[]): ModuleGraph {
    return {
        nodes: nodes.map(
            (flowNode) => ({ ...flowNode.data.node, position: flowNode.position }) as ModuleGraph['nodes'][number],
        ),
        edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    };
}

export function newActionNode(position: { x: number; y: number }): ActionFlowNode {
    const id = `action-${crypto.randomUUID().slice(0, 8)}`;
    return {
        id,
        type: 'action',
        position,
        data: {
            node: {
                id,
                kind: 'ACTION',
                type: 'CHATTER_POST_MESSAGE',
                label: 'Post message to Chatter',
                dataSourceId: null,
                config: { channel: '', messageTemplate: '' },
            },
        },
    };
}
