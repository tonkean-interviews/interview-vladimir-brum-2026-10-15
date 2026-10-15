import { config } from '../config';
import { findIncomingWebhook, markWebhookFailedIfPending } from './incoming-webhooks.repository';

const CONFIRMATION_TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 500;

/** The external system accepted the subscription but never delivered its confirmation ping. */
export class WebhookConfirmationError extends Error {}

/** Waits until the confirmation ping marks the webhook CONFIRMED; marks it FAILED if the ping doesn't arrive in time. */
export async function waitForWebhookConfirmation(webhookId: string, externalSystemName: string): Promise<void> {
    const deadline = Date.now() + CONFIRMATION_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const webhook = await findIncomingWebhook(webhookId);
        if (webhook?.status === 'CONFIRMED') {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    const message =
        `Webhook registration failed: the ${externalSystemName} system did not deliver its confirmation message ` +
        `to the webhook URL ${config.backendPublicUrl}/webhooks/incoming/... within ${CONFIRMATION_TIMEOUT_MS / 1000} seconds`;
    if (await markWebhookFailedIfPending(webhookId, message)) {
        throw new WebhookConfirmationError(message);
    }
}
