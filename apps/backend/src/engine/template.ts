const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g;

function getByPath(context: unknown, path: string): unknown {
    let current: unknown = context;
    for (const segment of path.split('.')) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

export function renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(PLACEHOLDER, (_match, path: string) => {
        const value = getByPath(context, path);
        if (value === undefined || value === null) {
            return '';
        }
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
}
