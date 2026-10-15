import { randomBytes } from 'node:crypto';
import type { IncomingWebhookStatus, IncomingWebhookSummary } from '@tiny-tonkean/shared/data-sources';
import type { Selectable } from 'kysely';
import { db } from '../db/database';
import type { IncomingWebhooksTable } from '../db/types';
import { newId } from '../ids';

export type IncomingWebhook = Selectable<IncomingWebhooksTable>;

export async function findIncomingWebhook(id: string): Promise<IncomingWebhook | undefined> {
    return db.selectFrom('incoming_webhooks').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function findIncomingWebhookByDataSource(dataSourceId: string): Promise<IncomingWebhook | undefined> {
    return db.selectFrom('incoming_webhooks').selectAll().where('data_source_id', '=', dataSourceId).executeTakeFirst();
}

export async function getOrCreateIncomingWebhook(dataSourceId: string): Promise<IncomingWebhook> {
    const existing = await findIncomingWebhookByDataSource(dataSourceId);
    if (existing) {
        return existing;
    }
    const id = newId('IW');
    await db
        .insertInto('incoming_webhooks')
        .values({
            id,
            data_source_id: dataSourceId,
            token: randomBytes(24).toString('hex'),
            signing_secret: randomBytes(24).toString('hex'),
            status: 'PENDING_CONFIRMATION',
        })
        .execute();
    return (await findIncomingWebhook(id))!;
}

export async function updateIncomingWebhook(
    id: string,
    changes: { status?: IncomingWebhookStatus; externalId?: string | null; lastError?: string | null },
): Promise<void> {
    await db
        .updateTable('incoming_webhooks')
        .set({
            ...(changes.status ? { status: changes.status } : {}),
            ...(changes.externalId !== undefined ? { external_id: changes.externalId } : {}),
            ...(changes.lastError !== undefined ? { last_error: changes.lastError } : {}),
            updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();
}

/** Marks a webhook that is still waiting for its confirmation as failed. Returns false if it got confirmed first. */
export async function markWebhookFailedIfPending(id: string, error: string): Promise<boolean> {
    const result = await db
        .updateTable('incoming_webhooks')
        .set({ status: 'FAILED', last_error: error, updated_at: new Date() })
        .where('id', '=', id)
        .where('status', '=', 'PENDING_CONFIRMATION')
        .executeTakeFirst();
    return result.numUpdatedRows > 0n;
}

export async function saveWebhookPayload(webhookId: string, messageType: string, rawBody: string): Promise<void> {
    await db
        .insertInto('incoming_webhook_payloads')
        .values({ incoming_webhook_id: webhookId, message_type: messageType, raw_body: rawBody })
        .execute();
}

export async function getWebhookSummary(dataSourceId: string): Promise<IncomingWebhookSummary | undefined> {
    const webhook = await findIncomingWebhookByDataSource(dataSourceId);
    if (!webhook) {
        return undefined;
    }
    const payloads = await db
        .selectFrom('incoming_webhook_payloads')
        .selectAll()
        .where('incoming_webhook_id', '=', webhook.id)
        .orderBy('id', 'desc')
        .limit(20)
        .execute();

    return {
        id: webhook.id,
        status: webhook.status as IncomingWebhookStatus,
        externalId: webhook.external_id,
        lastError: webhook.last_error,
        recentPayloads: payloads.map((payload) => ({
            id: payload.id,
            messageType: payload.message_type,
            rawBody: payload.raw_body,
            receivedAt: payload.received_at.toISOString(),
        })),
    };
}
