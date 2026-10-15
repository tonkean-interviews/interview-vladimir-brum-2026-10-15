import { type FormEvent, useCallback, useEffect, useState } from 'react';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

interface Ticket {
    id: string;
    title: string;
    description: string;
    priority: (typeof PRIORITIES)[number];
    reporter: string;
    status: string;
    createdAt: string;
}

const REFRESH_MS = 3000;
const EMPTY_FORM = { title: '', description: '', priority: 'MEDIUM', reporter: '' };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
    const body = (await response.json()) as T & { error?: string };
    if (!response.ok) {
        throw new Error(body.error ?? `${response.status} ${response.statusText}`);
    }
    return body;
}

export function App() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        () =>
            requestJson<{ tickets: Ticket[] }>('/api/tickets')
                .then((result) => setTickets(result.tickets))
                .catch((err: Error) => setError(err.message)),
        [],
    );

    useEffect(() => {
        void load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await requestJson('/api/tickets', { method: 'POST', body: JSON.stringify(form) });
            setForm({ ...EMPTY_FORM, reporter: form.reporter });
            await load();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page">
            <header className="topbar">
                <h1>Tickets</h1>
            </header>
            <div className="content">
                <form className="card new-ticket" onSubmit={onSubmit}>
                    <h2>New ticket</h2>
                    <label>
                        Title
                        <input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            required
                        />
                    </label>
                    <label>
                        Description
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                        />
                    </label>
                    <label>
                        Priority
                        <select
                            value={form.priority}
                            onChange={(event) => setForm({ ...form, priority: event.target.value })}
                        >
                            {PRIORITIES.map((priority) => (
                                <option key={priority} value={priority}>
                                    {priority}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Reporter
                        <input
                            type="email"
                            placeholder="you@tonkean.com"
                            value={form.reporter}
                            onChange={(event) => setForm({ ...form, reporter: event.target.value })}
                            required
                        />
                    </label>
                    {error && <div className="error">{error}</div>}
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating…' : 'Create ticket'}
                    </button>
                </form>

                <section className="card tickets">
                    <h2>All tickets</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Priority</th>
                                <th>Reporter</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map((ticket) => (
                                <tr key={ticket.id}>
                                    <td className="ticket-id">{ticket.id}</td>
                                    <td>
                                        <div>{ticket.title}</div>
                                        {ticket.description && <div className="muted">{ticket.description}</div>}
                                    </td>
                                    <td>
                                        <span className={`priority priority-${ticket.priority.toLowerCase()}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td>{ticket.reporter}</td>
                                    <td className="muted">{new Date(ticket.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}
