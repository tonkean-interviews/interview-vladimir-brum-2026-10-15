import { describe, expect, it } from 'vitest';
import type { ExternalActivity } from '../webhooks/external-activities.repository';
import { triggerNode } from './graph-fixtures.test-utils';
import { triggerMatchesActivity } from './trigger-matcher';

function ticketActivity(dataSourceId = 'DS_tickets'): ExternalActivity {
    return { id: 'ACT_1', dataSourceId, type: 'TICKET_CREATED', entityKey: 'TCK-1', payload: {} };
}

describe('triggerMatchesActivity', () => {
    const trigger = triggerNode();

    it('matches new tickets of the trigger data source', () => {
        expect(triggerMatchesActivity(trigger, ticketActivity())).toBe(true);
    });

    it('does not match other data sources', () => {
        expect(triggerMatchesActivity(trigger, ticketActivity('DS_other'))).toBe(false);
    });
});
