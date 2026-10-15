import type { ChatterChannelSummary, ChatterDataSourceConfig } from '@tiny-tonkean/shared/data-sources';

async function chatterRequest<T>(chatterConfig: ChatterDataSourceConfig, path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${chatterConfig.baseUrl}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${chatterConfig.apiToken}`,
            ...init?.headers,
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Chatter responded ${response.status}: ${body}`);
    }
    return (await response.json()) as T;
}

export async function listChatterChannels(chatterConfig: ChatterDataSourceConfig): Promise<ChatterChannelSummary[]> {
    const { channels } = await chatterRequest<{ channels: ChatterChannelSummary[] }>(chatterConfig, '/api/channels');
    return channels;
}

export async function testChatterConnection(chatterConfig: ChatterDataSourceConfig): Promise<void> {
    await listChatterChannels(chatterConfig);
}

export async function postChatterMessage(
    chatterConfig: ChatterDataSourceConfig,
    channel: string,
    text: string,
): Promise<{ messageId: string; channel: string; text: string }> {
    const { message } = await chatterRequest<{ message: { id: string; channel: string; text: string } }>(
        chatterConfig,
        `/api/channels/${encodeURIComponent(channel)}/messages`,
        { method: 'POST', body: JSON.stringify({ text, author: 'Tonkean' }) },
    );
    return { messageId: message.id, channel: message.channel, text: message.text };
}
