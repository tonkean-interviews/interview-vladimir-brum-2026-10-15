import type { FastifyBaseLogger } from 'fastify';
import { listDataSources } from './data-sources/data-sources.repository';
import { pingDatabase } from './db/database';
import { registerForWebhooks } from './integrations/integrations';
import { WebhookConfirmationError } from './webhooks/webhook-confirmation';

async function retry(what: string, logger: FastifyBaseLogger, action: () => Promise<void>): Promise<void> {
    const maxAttempts = 30;
    for (let attempt = 1; ; attempt++) {
        try {
            await action();
            return;
        } catch (error) {
            // Retrying can't fix an unreachable webhook URL; it only needs a configuration change.
            if (attempt === maxAttempts || error instanceof WebhookConfirmationError) {
                throw error;
            }
            logger.warn({ err: error, attempt }, `${what} failed, retrying`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
}

/** MySQL and the ticketing service both start empty, so webhook subscriptions are re-created on every boot. */
export async function bootstrap(logger: FastifyBaseLogger): Promise<void> {
    await retry('Database connection', logger, pingDatabase);

    for (const dataSource of await listDataSources()) {
        try {
            await retry(`Webhook registration for ${dataSource.name}`, logger, () => registerForWebhooks(dataSource));
        } catch (error) {
            if (!(error instanceof WebhookConfirmationError)) {
                throw error;
            }
            // Keep serving: the webhook is marked FAILED and can be re-registered from the Data Sources page.
            logger.error({ dataSource: dataSource.name }, error.message);
        }
    }
}
