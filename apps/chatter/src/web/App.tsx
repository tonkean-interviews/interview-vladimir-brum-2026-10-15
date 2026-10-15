import { useEffect, useState } from 'react';

interface Message {
    id: string;
    author: string;
    text: string;
    createdAt: string;
}

const REFRESH_MS = 2000;

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
}

export function App() {
    const [channels, setChannels] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getJson<{ channels: { name: string }[] }>('/api/channels')
            .then(({ channels: list }) => {
                setChannels(list.map((channel) => channel.name));
                setSelected((current) => current ?? list[0]?.name ?? null);
            })
            .catch((err: Error) => setError(err.message));
    }, []);

    useEffect(() => {
        if (!selected) {
            return;
        }
        let cancelled = false;
        const load = () =>
            getJson<{ messages: Message[] }>(`/api/channels/${encodeURIComponent(selected)}/messages`)
                .then((result) => !cancelled && setMessages(result.messages))
                .catch((err: Error) => !cancelled && setError(err.message));
        void load();
        const timer = setInterval(load, REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [selected]);

    return (
        <div className="layout">
            <aside className="sidebar">
                <h1>Chatter</h1>
                <nav>
                    {channels.map((channel) => (
                        <button
                            key={channel}
                            className={channel === selected ? 'channel active' : 'channel'}
                            onClick={() => setSelected(channel)}
                        >
                            # {channel}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="messages">
                <header># {selected}</header>
                {error && <div className="error">{error}</div>}
                <ul>
                    {messages.map((message) => (
                        <li key={message.id}>
                            <div className="meta">
                                <strong>{message.author}</strong>
                                <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
                            </div>
                            <div>{message.text}</div>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
