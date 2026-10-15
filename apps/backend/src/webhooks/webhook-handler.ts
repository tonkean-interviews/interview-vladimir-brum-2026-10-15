import { findDataSource } from '../data-sources/data-sources.repository';
import { runModule } from '../engine/run-module';
import { triggerMatchesActivity } from '../engine/trigger-matcher';
import { parseTicketsEvent, type TicketsWebhookEvent } from '../integrations/tickets-webhook-parser';
import { findPublishedModulesWithTrigger } from '../modules/modules.repository';
import { insertExternalActivity } from './external-activities.repository';

export interface WebhookNotificationEvent {
    dataSourceId: string;
    message: string;
}

/** Async half of webhook handling: payload -> external activities -> matching module runs. */
export async function handleWebhookNotification(event: WebhookNotificationEvent): Promise<void> {
    const dataSource = await findDataSource(event.dataSourceId);
    if (!dataSource || dataSource.type !== 'TICKETS') {
        return;
    }

    const activityInputs = parseTicketsEvent(JSON.parse(event.message) as TicketsWebhookEvent, dataSource.id);
    for (const activityInput of activityInputs) {
        const activity = await insertExternalActivity(activityInput);
        const candidates = await findPublishedModulesWithTrigger(dataSource.id);

        for (const { moduleId, trigger } of candidates) {
            if (triggerMatchesActivity(trigger, activity)) {
                await runModule({
                    moduleId,
                    triggerPayload: activity.payload,
                    isTest: false,
                    externalActivityId: activity.id,
                });
            }
        }
    }
}
