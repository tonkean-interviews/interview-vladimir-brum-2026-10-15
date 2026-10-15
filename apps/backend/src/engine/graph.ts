import {
    chatterPostMessageConfigSchema,
    findNodeDefinition,
    type ModuleGraph,
    type ModuleNode,
    type TriggerNode,
} from '@tiny-tonkean/shared/module-graph';

export function findTriggerNode(graph: ModuleGraph): TriggerNode | undefined {
    return graph.nodes.find((node): node is TriggerNode => node.kind === 'TRIGGER');
}

/** Structural rules that every saved module must satisfy, including drafts. */
export function validateGraphStructure(graph: ModuleGraph): string[] {
    const errors: string[] = [];
    const nodeIds = new Set<string>();

    for (const node of graph.nodes) {
        if (nodeIds.has(node.id)) {
            errors.push(`Duplicate node id "${node.id}"`);
        }
        nodeIds.add(node.id);

        const definition = findNodeDefinition(node);
        if (!definition) {
            errors.push(`"${node.label}" has an unknown type "${node.type}"`);
        } else if (!definition.configSchema.safeParse(node.config).success) {
            errors.push(`"${node.label}" has an invalid configuration`);
        }
    }

    const triggerCount = graph.nodes.filter((node) => node.kind === 'TRIGGER').length;
    if (triggerCount !== 1) {
        errors.push(`A module must have exactly one trigger, found ${triggerCount}`);
    }

    const edgeIds = new Set<string>();
    for (const edge of graph.edges) {
        if (edgeIds.has(edge.id)) {
            errors.push(`Duplicate edge id "${edge.id}"`);
        }
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
            errors.push(`Edge "${edge.id}" points to a node that does not exist`);
        }
        if (edge.source === edge.target) {
            errors.push(`Edge "${edge.id}" connects a node to itself`);
        }
        const target = graph.nodes.find((node) => node.id === edge.target);
        if (target?.kind === 'TRIGGER') {
            errors.push(`Edge "${edge.id}" points into the trigger`);
        }
    }

    if (errors.length === 0 && hasCycle(graph)) {
        errors.push('The module graph contains a cycle');
    }

    return errors;
}

/** Extra rules a module must satisfy before it can be published and react to real events. */
export function validateGraphForPublish(graph: ModuleGraph): string[] {
    const errors = validateGraphStructure(graph);
    for (const node of graph.nodes) {
        if (!node.dataSourceId) {
            errors.push(`"${node.label}" has no data source`);
        }
        const chatterConfig =
            node.kind === 'ACTION' && node.type === 'CHATTER_POST_MESSAGE'
                ? chatterPostMessageConfigSchema.safeParse(node.config)
                : undefined;
        if (chatterConfig?.success) {
            if (!chatterConfig.data.channel.trim()) {
                errors.push(`"${node.label}" has no channel`);
            }
            if (!chatterConfig.data.messageTemplate.trim()) {
                errors.push(`"${node.label}" has no message`);
            }
        }
    }
    return errors;
}

function hasCycle(graph: ModuleGraph): boolean {
    return topologicalOrder(graph).length !== graph.nodes.length;
}

/** Kahn's algorithm. Nodes that are part of a cycle are left out of the result. */
export function topologicalOrder(graph: ModuleGraph): ModuleNode[] {
    const inDegree = new Map(graph.nodes.map((node) => [node.id, 0]));
    for (const edge of graph.edges) {
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const queue = graph.nodes.filter((node) => inDegree.get(node.id) === 0);
    const ordered: ModuleNode[] = [];

    while (queue.length > 0) {
        const node = queue.shift()!;
        ordered.push(node);
        for (const edge of graph.edges) {
            if (edge.source !== node.id) {
                continue;
            }
            const remaining = (inDegree.get(edge.target) ?? 0) - 1;
            inDegree.set(edge.target, remaining);
            if (remaining === 0) {
                const target = graph.nodes.find((candidate) => candidate.id === edge.target);
                if (target) {
                    queue.push(target);
                }
            }
        }
    }

    return ordered;
}

export function parentIds(graph: ModuleGraph, nodeId: string): string[] {
    return graph.edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
}
