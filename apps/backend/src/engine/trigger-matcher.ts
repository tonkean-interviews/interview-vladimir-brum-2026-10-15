import type { TriggerNode } from '@tiny-tonkean/shared/module-graph';
import type { ExternalActivity } from '../webhooks/external-activities.repository';

export function triggerMatchesActivity(trigger: TriggerNode, activity: ExternalActivity): boolean {
    if (trigger.dataSourceId !== activity.dataSourceId) {
        return false;
    }
    switch (trigger.type) {
        case 'TICKET_CREATED':
            return activity.type === 'TICKET_CREATED';
        default:
            return false;
    }
}
