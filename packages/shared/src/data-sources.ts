import { z } from 'zod';

export const DATA_SOURCE_TYPES = ['TICKETS', 'CHATTER'] as const;
export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

export const ticketsDataSourceConfigSchema = z.object({
    baseUrl: z.string().min(1),
    apiToken: z.string().min(1),
});
export type TicketsDataSourceConfig = z.infer<typeof ticketsDataSourceConfigSchema>;

export const chatterDataSourceConfigSchema = z.object({
    baseUrl: z.string().min(1),
    apiToken: z.string().min(1),
});
export type ChatterDataSourceConfig = z.infer<typeof chatterDataSourceConfigSchema>;

export const dataSourceInputSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('TICKETS'), name: z.string().min(1), config: ticketsDataSourceConfigSchema }),
    z.object({ type: z.literal('CHATTER'), name: z.string().min(1), config: chatterDataSourceConfigSchema }),
]);
export type DataSourceInput = z.infer<typeof dataSourceInputSchema>;

export type DataSource = DataSourceInput & {
    id: string;
    createdAt: string;
    updatedAt: string;
};

export type IncomingWebhookStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'FAILED';

export interface IncomingWebhookSummary {
    id: string;
    status: IncomingWebhookStatus;
    externalId: string | null;
    lastError: string | null;
    recentPayloads: {
        id: number;
        messageType: string;
        rawBody: string;
        receivedAt: string;
    }[];
}

export interface TicketSummary {
    id: string;
    title: string;
    description: string;
    priority: string;
    reporter: string;
    createdAt: string;
}

export interface ChatterChannelSummary {
    name: string;
}
