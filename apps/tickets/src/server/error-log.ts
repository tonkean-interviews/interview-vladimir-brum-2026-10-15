import { Writable } from 'node:stream';

const MAX_ERROR_LOGS = 100;
const ERROR_LEVEL = 50;

export interface ErrorLogEntry {
    time: string;
    message: string;
    details: Record<string, unknown>;
}

/** Keeps the most recent error-level log lines while still forwarding them to stdout. */
export class ErrorLog {
    private readonly entries: ErrorLogEntry[] = [];
    private pending = '';

    list(): ErrorLogEntry[] {
        return [...this.entries].reverse();
    }

    ingest(chunk: string): void {
        this.pending += chunk;
        const lines = this.pending.split('\n');
        this.pending = lines.pop() ?? '';
        for (const line of lines) {
            this.recordLine(line);
        }
    }

    stream(): Writable {
        return new Writable({
            write: (chunk: Buffer | string, _encoding, callback) => {
                const text = chunk.toString();
                process.stdout.write(text);
                this.ingest(text);
                callback();
            },
        });
    }

    private recordLine(line: string): void {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) {
            return;
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
            return;
        }
        if (typeof parsed.level !== 'number' || parsed.level < ERROR_LEVEL) {
            return;
        }

        const details = { ...parsed };
        delete details.level;
        delete details.time;
        delete details.pid;
        delete details.hostname;
        delete details.msg;
        this.entries.push({
            time: typeof parsed.time === 'number' ? new Date(parsed.time).toISOString() : new Date().toISOString(),
            message: typeof parsed.msg === 'string' ? parsed.msg : trimmed,
            details,
        });
        if (this.entries.length > MAX_ERROR_LOGS) {
            this.entries.shift();
        }
    }
}
