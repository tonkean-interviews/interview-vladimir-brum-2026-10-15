import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from './client';

export interface CurrentUser {
    id: string;
    email: string;
    name: string;
}

const meKey = ['auth', 'me'];

export function useCurrentUser() {
    return useQuery({ queryKey: meKey, queryFn: () => apiFetch<CurrentUser>('/auth/me'), retry: false });
}

export function useLogin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (credentials: { email: string; password: string }) =>
            apiFetch<CurrentUser>('/auth/login', { method: 'POST', body: jsonBody(credentials) }),
        onSuccess: (user) => queryClient.setQueryData(meKey, user),
    });
}

export function useLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
        onSuccess: () => queryClient.clear(),
    });
}
