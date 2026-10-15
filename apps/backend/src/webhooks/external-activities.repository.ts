import { db } from '../db/database';
import { newId } from '../ids';

export interface ExternalActivityInput {
    dataSourceId: string;
    type: 'TICKET_CREATED';
    entityKey: string;
    payload: Record<string, unknown>;
}

export interface ExternalActivity extends ExternalActivityInput {
    id: string;
}

export async function insertExternalActivity(input: ExternalActivityInput): Promise<ExternalActivity> {
    const id = newId('ACT');
    await db
        .insertInto('external_activities')
        .values({
            id,
            data_source_id: input.dataSourceId,
            type: input.type,
            entity_key: input.entityKey,
            payload: JSON.stringify(input.payload),
        })
        .execute();
    return { id, ...input };
}
