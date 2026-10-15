import { createHmac, timingSafeEqual } from 'node:crypto';

/** The secret in a webhook URL identifies the webhook and proves the caller knows its token. */
export function encodeWebhookSecret(webhookId: string, token: string): string {
    return Buffer.from(`${webhookId}:${token}`).toString('base64url');
}

export function decodeWebhookSecret(secret: string): { webhookId: string; token: string } | undefined {
    const decoded = Buffer.from(secret, 'base64url').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator <= 0 || separator === decoded.length - 1) {
        return undefined;
    }
    return { webhookId: decoded.slice(0, separator), token: decoded.slice(separator + 1) };
}

export function tokensMatch(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

/** Checks a `sha256=<hex>` HMAC signature of the raw request body. */
export function signatureMatches(signingSecret: string, rawBody: string, signature: string | undefined): boolean {
    const expected = `sha256=${createHmac('sha256', signingSecret).update(rawBody).digest('hex')}`;
    return signature !== undefined && tokensMatch(expected, signature);
}

export function buildWebhookUrl(backendPublicUrl: string, webhookId: string, token: string): string {
    return `${backendPublicUrl}/webhooks/incoming/${encodeWebhookSecret(webhookId, token)}`;
}
