import type { DataSource } from '@tiny-tonkean/shared/data-sources';
import { chatterPostMessageConfigSchema } from '@tiny-tonkean/shared/module-graph';
import type { ActionExecutor } from '../engine/execute-graph';
import { findDataSource } from '../data-sources/data-sources.repository';
import { postChatterMessage, testChatterConnection } from './chatter.integration';
import { registerTicketsWebhooks, testTicketsConnection } from './tickets.integration';

export async function testConnection(dataSource: DataSource): Promise<void> {
    switch (dataSource.type) {
        case 'TICKETS':
            return testTicketsConnection(dataSource.config);
        case 'CHATTER':
            return testChatterConnection(dataSource.config);
    }
}

/** Mirrors Tonkean's `registerForWebhooks`: only integrations that push events implement it. */
export async function registerForWebhooks(dataSource: DataSource): Promise<void> {
    if (dataSource.type === 'TICKETS') {
        await registerTicketsWebhooks(dataSource.id, dataSource.config);
    }
}

export const executeAction: ActionExecutor = async (node, renderedConfig) => {
    if (!node.dataSourceId) {
        throw new Error('No data source selected');
    }
    const dataSource = await findDataSource(node.dataSourceId);
    if (!dataSource) {
        throw new Error(`Data source ${node.dataSourceId} not found`);
    }

    switch (node.type) {
        case 'CHATTER_POST_MESSAGE': {
            if (dataSource.type !== 'CHATTER') {
                throw new Error(`"${dataSource.name}" is not a Chatter data source`);
            }
            const { channel, messageTemplate } = chatterPostMessageConfigSchema.parse(renderedConfig);
            return postChatterMessage(dataSource.config, channel, messageTemplate);
        }
        default:
            throw new Error(`Unknown action type "${node.type}"`);
    }
};
