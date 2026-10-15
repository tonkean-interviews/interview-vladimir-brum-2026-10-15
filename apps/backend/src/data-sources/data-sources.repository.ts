import type { DataSource, DataSourceInput } from '@tiny-tonkean/shared/data-sources';
import { db } from '../db/database';
import type { DataSourcesTable } from '../db/types';
import { newId } from '../ids';
import type { Selectable } from 'kysely';

function toDataSource(row: Selectable<DataSourcesTable>): DataSource {
    return {
        id: row.id,
        type: row.type,
        name: row.name,
        config: row.config,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    } as DataSource;
}

export async function listDataSources(): Promise<DataSource[]> {
    const rows = await db.selectFrom('data_sources').selectAll().orderBy('created_at').execute();
    return rows.map(toDataSource);
}

export async function findDataSource(id: string): Promise<DataSource | undefined> {
    const row = await db.selectFrom('data_sources').selectAll().where('id', '=', id).executeTakeFirst();
    return row ? toDataSource(row) : undefined;
}

export async function createDataSource(input: DataSourceInput): Promise<DataSource> {
    const id = newId('DS');
    await db
        .insertInto('data_sources')
        .values({ id, type: input.type, name: input.name, config: JSON.stringify(input.config) })
        .execute();
    return (await findDataSource(id))!;
}

export async function updateDataSource(id: string, input: DataSourceInput): Promise<DataSource | undefined> {
    await db
        .updateTable('data_sources')
        .set({ type: input.type, name: input.name, config: JSON.stringify(input.config), updated_at: new Date() })
        .where('id', '=', id)
        .execute();
    return findDataSource(id);
}

export async function deleteDataSource(id: string): Promise<void> {
    await db.deleteFrom('data_sources').where('id', '=', id).execute();
}
