import type { ModuleDocument, ModuleSummary, SaveModuleInput } from '@tiny-tonkean/shared/module-graph';
import type { ModuleRun, TestRunInput } from '@tiny-tonkean/shared/runs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from './client';

const modulesKey = ['modules'];

export function useModules() {
    return useQuery({ queryKey: modulesKey, queryFn: () => apiFetch<ModuleSummary[]>('/modules') });
}

export function useModule(moduleId: string) {
    return useQuery({
        queryKey: [...modulesKey, moduleId],
        queryFn: () => apiFetch<ModuleDocument>(`/modules/${moduleId}`),
        // The editor owns the graph state after load; refetching would overwrite unsaved edits.
        refetchOnWindowFocus: false,
    });
}

export function useCreateModule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name: string) =>
            apiFetch<ModuleDocument>('/modules', { method: 'POST', body: jsonBody({ name }) }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: modulesKey }),
    });
}

export function useDeleteModule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (moduleId: string) => apiFetch(`/modules/${moduleId}`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: modulesKey }),
    });
}

export function useSaveModule(moduleId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: SaveModuleInput) =>
            apiFetch<ModuleDocument>(`/modules/${moduleId}`, { method: 'PUT', body: jsonBody(input) }),
        onSuccess: (module) => {
            queryClient.setQueryData([...modulesKey, moduleId], module);
            void queryClient.invalidateQueries({ queryKey: modulesKey, exact: true });
        },
    });
}

export function useSetPublished(moduleId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (isPublished: boolean) =>
            apiFetch<ModuleDocument>(`/modules/${moduleId}/publish`, {
                method: 'POST',
                body: jsonBody({ isPublished }),
            }),
        onSuccess: (module) => {
            queryClient.setQueryData([...modulesKey, moduleId], module);
            void queryClient.invalidateQueries({ queryKey: modulesKey, exact: true });
        },
    });
}

export function useModuleRuns(moduleId: string) {
    return useQuery({
        queryKey: [...modulesKey, moduleId, 'runs'],
        queryFn: () => apiFetch<ModuleRun[]>(`/modules/${moduleId}/runs`),
        refetchInterval: 3000,
    });
}

export function useTestModule(moduleId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: TestRunInput) =>
            apiFetch<ModuleRun>(`/modules/${moduleId}/test`, { method: 'POST', body: jsonBody(input) }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [...modulesKey, moduleId, 'runs'] }),
    });
}
