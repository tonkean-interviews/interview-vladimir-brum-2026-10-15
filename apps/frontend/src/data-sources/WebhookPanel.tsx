import type { IncomingWebhookStatus } from '@tiny-tonkean/shared/data-sources';
import { useRegisterWebhook, useWebhookSummary } from '../api/data-sources';

const STATUS_BADGES: Record<IncomingWebhookStatus, { label: string; className: string }> = {
    PENDING_CONFIRMATION: { label: 'Pending confirmation', className: 'badge warning' },
    CONFIRMED: { label: 'Confirmed', className: 'badge success' },
    FAILED: { label: 'Registration failed', className: 'badge danger' },
};

const REGISTER_HINT =
    'Removes the existing webhook subscription in the external system and subscribes again. ' +
    'The external system then sends a confirmation ping to the webhook URL; if no ping arrives ' +
    'within 5 seconds, registration fails.';

function prettyJson(raw: string): string {
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
}

export function WebhookPanel({ dataSourceId }: { dataSourceId: string }) {
    const { data: webhook, error } = useWebhookSummary(dataSourceId);
    const register = useRegisterWebhook(dataSourceId);

    return (
        <div className="webhook-panel">
            <div className="row">
                <strong>Webhook</strong>
                {webhook && (
                    <span className={STATUS_BADGES[webhook.status].className}>
                        {STATUS_BADGES[webhook.status].label}
                    </span>
                )}
                <button onClick={() => register.mutate()} disabled={register.isPending}>
                    {register.isPending ? 'Registering…' : 'Re-register webhook'}
                </button>
                <span className="hint" data-hint={REGISTER_HINT} aria-label={REGISTER_HINT} role="img" tabIndex={0}>
                    ?
                </span>
            </div>
            {error && <div className="error">{error.message}</div>}
            {webhook?.status === 'FAILED' && webhook.lastError && <div className="error">{webhook.lastError}</div>}
            {register.error && register.error.message !== webhook?.lastError && (
                <div className="error">{register.error.message}</div>
            )}
            {webhook?.externalId && <div className="muted">Subscription: {webhook.externalId}</div>}

            <table className="table">
                <thead>
                    <tr>
                        <th>Received</th>
                        <th>Type</th>
                        <th>Payload</th>
                    </tr>
                </thead>
                <tbody>
                    {webhook?.recentPayloads.map((payload) => (
                        <tr key={payload.id}>
                            <td>{new Date(payload.receivedAt).toLocaleTimeString()}</td>
                            <td>{payload.messageType}</td>
                            <td>
                                <details>
                                    <summary>Show</summary>
                                    <pre>{prettyJson(payload.rawBody)}</pre>
                                </details>
                            </td>
                        </tr>
                    ))}
                    {webhook?.recentPayloads.length === 0 && (
                        <tr>
                            <td colSpan={3} className="muted">
                                No payloads received yet
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
