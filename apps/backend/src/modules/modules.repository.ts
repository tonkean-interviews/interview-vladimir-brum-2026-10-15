import type {
    ModuleDocument,
    ModuleEdge,
    ModuleGraph,
    ModuleNode,
    ModuleSummary,
    TriggerNode,
} from '@tiny-tonkean/shared/module-graph';
import type { Selectable } from 'kysely';
import { db } from '../db/database';
import type { ModuleEdgesTable, ModuleNodesTable, ModulesTable } from '../db/types';
import { newId } from '../ids';

function toSummary(row: Selectable<ModulesTable>): ModuleSummary {
    return {
        id: row.id,
        name: row.name,
        isPublished: row.is_published === 1,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}

function toNode(row: Selectable<ModuleNodesTable>): ModuleNode {
    return {
        id: row.id,
        kind: row.kind,
        type: row.type,
        label: row.label,
        dataSourceId: row.data_source_id,
        config: row.config,
        position: { x: row.position_x, y: row.position_y },
    } as ModuleNode;
}

function toEdge(row: Selectable<ModuleEdgesTable>): ModuleEdge {
    return { id: row.id, source: row.source_node_id, target: row.target_node_id };
}

export async function listModules(): Promise<ModuleSummary[]> {
    const rows = await db.selectFrom('modules').selectAll().orderBy('created_at').execute();
    return rows.map(toSummary);
}

export async function loadModuleGraph(moduleId: string): Promise<ModuleGraph> {
    const [nodes, edges] = await Promise.all([
        db.selectFrom('module_nodes').selectAll().where('module_id', '=', moduleId).execute(),
        db.selectFrom('module_edges').selectAll().where('module_id', '=', moduleId).execute(),
    ]);
    return { nodes: nodes.map(toNode), edges: edges.map(toEdge) };
}

export async function findModule(moduleId: string): Promise<ModuleDocument | undefined> {
    const row = await db.selectFrom('modules').selectAll().where('id', '=', moduleId).executeTakeFirst();
    if (!row) {
        return undefined;
    }
    return { ...toSummary(row), ...(await loadModuleGraph(moduleId)) };
}

export async function createModule(name: string, createdBy: string): Promise<ModuleDocument> {
    const id = newId('MOD');
    const trigger: TriggerNode = {
        id: 'trigger',
        kind: 'TRIGGER',
        type: 'TICKET_CREATED',
        label: 'When a ticket is created',
        dataSourceId: null,
        config: {},
        position: { x: 80, y: 160 },
    };
    await db.transaction().execute(async (trx) => {
        await trx.insertInto('modules').values({ id, name, is_published: 0, created_by: createdBy }).execute();
        await trx.insertInto('module_nodes').values(toNodeRow(id, trigger)).execute();
    });
    return (await findModule(id))!;
}

/** Replaces the module's whole graph in one transaction. */
export async function saveModule(moduleId: string, name: string, graph: ModuleGraph): Promise<void> {
    await db.transaction().execute(async (trx) => {
        await trx.updateTable('modules').set({ name, updated_at: new Date() }).where('id', '=', moduleId).execute();
        await trx.deleteFrom('module_edges').where('module_id', '=', moduleId).execute();
        await trx.deleteFrom('module_nodes').where('module_id', '=', moduleId).execute();
        if (graph.nodes.length > 0) {
            await trx
                .insertInto('module_nodes')
                .values(graph.nodes.map((node) => toNodeRow(moduleId, node)))
                .execute();
        }
        if (graph.edges.length > 0) {
            await trx
                .insertInto('module_edges')
                .values(
                    graph.edges.map((edge) => ({
                        module_id: moduleId,
                        id: edge.id,
                        source_node_id: edge.source,
                        target_node_id: edge.target,
                    })),
                )
                .execute();
        }
    });
}

export async function setModulePublished(moduleId: string, isPublished: boolean): Promise<void> {
    await db
        .updateTable('modules')
        .set({ is_published: isPublished ? 1 : 0, updated_at: new Date() })
        .where('id', '=', moduleId)
        .execute();
}

export async function deleteModule(moduleId: string): Promise<void> {
    await db.deleteFrom('modules').where('id', '=', moduleId).execute();
}

/** Published modules whose trigger listens to the given data source. */
export async function findPublishedModulesWithTrigger(
    dataSourceId: string,
): Promise<{ moduleId: string; trigger: TriggerNode }[]> {
    const rows = await db
        .selectFrom('module_nodes')
        .innerJoin('modules', 'modules.id', 'module_nodes.module_id')
        .selectAll('module_nodes')
        .where('modules.is_published', '=', 1)
        .where('module_nodes.kind', '=', 'TRIGGER')
        .where('module_nodes.data_source_id', '=', dataSourceId)
        .execute();
    return rows.map((row) => ({ moduleId: row.module_id, trigger: toNode(row) as TriggerNode }));
}

function toNodeRow(moduleId: string, node: ModuleNode) {
    return {
        module_id: moduleId,
        id: node.id,
        kind: node.kind,
        type: node.type,
        label: node.label,
        data_source_id: node.dataSourceId,
        config: JSON.stringify(node.config),
        position_x: node.position.x,
        position_y: node.position.y,
    };
}
