export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly details: string[] = [],
    ) {
        super(message);
    }
}

function toDetails(details: unknown): string[] {
    if (!Array.isArray(details)) {
        return [];
    }
    return details.map((detail) =>
        typeof detail === 'string' ? detail : String((detail as { message?: unknown }).message ?? detail),
    );
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/api${path}`, {
        ...init,
        headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });

    if (response.status === 204) {
        return undefined as T;
    }

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
        throw new ApiError(String(body.error ?? response.statusText), response.status, toDetails(body.details));
    }
    return body as T;
}

export function jsonBody(value: unknown): RequestInit['body'] {
    return JSON.stringify(value);
}
