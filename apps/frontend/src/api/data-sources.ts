import type {
    ChatterChannelSummary,
    DataSource,
    DataSourceInput,
    IncomingWebhookSummary,
    TicketSummary,
} from '@tiny-tonkean/shared/data-sources';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from './client';

const dataSourcesKey = ['data-sources'];

export function useDataSources() {
    return useQuery({ queryKey: dataSourcesKey, queryFn: () => apiFetch<DataSource[]>('/data-sources') });
}

export function useSaveDataSource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id?: string; input: DataSourceInput }) =>
            apiFetch<DataSource>(id ? `/data-sources/${id}` : '/data-sources', {
                method: id ? 'PUT' : 'POST',
                body: jsonBody(input),
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: dataSourcesKey }),
    });
}

export function useDeleteDataSource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiFetch(`/data-sources/${id}`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: dataSourcesKey }),
    });
}

export function useTestConnection() {
    return useMutation({
        mutationFn: (id: string) =>
            apiFetch<{ ok: boolean; error?: string }>(`/data-sources/${id}/test-connection`, { method: 'POST' }),
    });
}

export function useWebhookSummary(dataSourceId: string) {
    return useQuery({
        queryKey: [...dataSourcesKey, dataSourceId, 'webhook'],
        queryFn: () => apiFetch<IncomingWebhookSummary>(`/data-sources/${dataSourceId}/webhook`),
        refetchInterval: 5000,
    });
}

export function useRegisterWebhook(dataSourceId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () =>
            apiFetch<IncomingWebhookSummary>(`/data-sources/${dataSourceId}/webhook/register`, { method: 'POST' }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: [...dataSourcesKey, dataSourceId, 'webhook'] }),
    });
}

export function useTickets(dataSourceId: string | null) {
    return useQuery({
        queryKey: [...dataSourcesKey, dataSourceId, 'tickets'],
        queryFn: () => apiFetch<TicketSummary[]>(`/data-sources/${dataSourceId}/tickets`),
        enabled: Boolean(dataSourceId),
    });
}

export function useChatterChannels(dataSourceId: string | null) {
    return useQuery({
        queryKey: [...dataSourcesKey, dataSourceId, 'channels'],
        queryFn: () => apiFetch<ChatterChannelSummary[]>(`/data-sources/${dataSourceId}/channels`),
        enabled: Boolean(dataSourceId),
    });
}
