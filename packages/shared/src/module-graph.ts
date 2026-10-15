import { z } from 'zod';

const positionSchema = z.object({ x: z.number(), y: z.number() });

/** Each trigger and action type defines the shape of its own config; see `TRIGGER_DEFINITIONS` and `ACTION_DEFINITIONS`. */
const nodeConfigSchema = z.record(z.string(), z.unknown());
export type NodeConfig = z.infer<typeof nodeConfigSchema>;

export const triggerNodeSchema = z.object({
    id: z.string().min(1),
    kind: z.literal('TRIGGER'),
    type: z.string().min(1),
    label: z.string(),
    dataSourceId: z.string().nullable(),
    config: nodeConfigSchema,
    position: positionSchema,
});
export type TriggerNode = z.infer<typeof triggerNodeSchema>;

export const actionNodeSchema = z.object({
    id: z.string().min(1),
    kind: z.literal('ACTION'),
    type: z.string().min(1),
    label: z.string(),
    dataSourceId: z.string().nullable(),
    config: nodeConfigSchema,
    position: positionSchema,
});
export type ActionNode = z.infer<typeof actionNodeSchema>;

export const moduleNodeSchema = z.discriminatedUnion('kind', [triggerNodeSchema, actionNodeSchema]);
export type ModuleNode = z.infer<typeof moduleNodeSchema>;

export const moduleEdgeSchema = z.object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
});
export type ModuleEdge = z.infer<typeof moduleEdgeSchema>;

export const moduleGraphSchema = z.object({
    nodes: z.array(moduleNodeSchema),
    edges: z.array(moduleEdgeSchema),
});
export type ModuleGraph = z.infer<typeof moduleGraphSchema>;

export const saveModuleSchema = moduleGraphSchema.extend({
    name: z.string().min(1),
});
export type SaveModuleInput = z.infer<typeof saveModuleSchema>;

export interface ModuleSummary {
    id: string;
    name: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ModuleDocument extends ModuleSummary, ModuleGraph {}

export interface TemplateVariable {
    path: string;
    description: string;
}

export interface NodeTypeDefinition {
    configSchema: z.ZodType<NodeConfig>;
    /** Values the node produces for later nodes' templates. Trigger paths are absolute, action paths are relative to the node. */
    outputs: TemplateVariable[];
}

export const chatterPostMessageConfigSchema = z.object({
    channel: z.string(),
    messageTemplate: z.string(),
});
export type ChatterPostMessageConfig = z.infer<typeof chatterPostMessageConfigSchema>;

export const TRIGGER_DEFINITIONS: Record<string, NodeTypeDefinition> = {
    TICKET_CREATED: {
        configSchema: z.object({}),
        outputs: [
            { path: 'trigger.id', description: 'Ticket ID, e.g. TCK-3' },
            { path: 'trigger.title', description: 'Ticket title' },
            { path: 'trigger.description', description: 'Ticket description' },
            { path: 'trigger.priority', description: 'LOW, MEDIUM, HIGH or URGENT' },
            { path: 'trigger.reporter', description: 'Email of the reporter' },
            { path: 'trigger.createdAt', description: 'Creation time (ISO 8601)' },
        ],
    },
};

export const ACTION_DEFINITIONS: Record<string, NodeTypeDefinition> = {
    CHATTER_POST_MESSAGE: {
        configSchema: chatterPostMessageConfigSchema,
        outputs: [
            { path: 'messageId', description: 'ID of the posted message' },
            { path: 'channel', description: 'Channel the message was posted to' },
            { path: 'text', description: 'Rendered message text' },
        ],
    },
};

export function findNodeDefinition(node: Pick<ModuleNode, 'kind' | 'type'>): NodeTypeDefinition | undefined {
    const definitions = node.kind === 'TRIGGER' ? TRIGGER_DEFINITIONS : ACTION_DEFINITIONS;
    return Object.hasOwn(definitions, node.type) ? definitions[node.type] : undefined;
}
