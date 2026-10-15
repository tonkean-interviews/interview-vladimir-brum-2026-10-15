import type { ModuleRun } from '@tiny-tonkean/shared/runs';
import { useState } from 'react';
import { useTickets } from '../../api/data-sources';
import { useTestModule } from '../../api/modules';

interface Props {
    moduleId: string;
    triggerDataSourceId: string | null;
    hasUnsavedChanges: boolean;
    onRunFinished: (run: ModuleRun) => void;
}

export function TestPanel({ moduleId, triggerDataSourceId, hasUnsavedChanges, onRunFinished }: Props) {
    const [mode, setMode] = useState<'existing' | 'fake'>('fake');
    const [title, setTitle] = useState('Test ticket');
    const [ticketId, setTicketId] = useState('');
    const { data: tickets = [] } = useTickets(mode === 'existing' ? triggerDataSourceId : null);
    const testModule = useTestModule(moduleId);

    const run = () => {
        const input = mode === 'existing' ? { ticketId } : { title };
        testModule.mutate(input, { onSuccess: onRunFinished });
    };

    return (
        <section className="panel-section">
            <h4>Test module</h4>
            <div className="row">
                <label className="inline">
                    <input type="radio" checked={mode === 'fake'} onChange={() => setMode('fake')} />
                    Sample ticket
                </label>
                <label className="inline">
                    <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} />
                    Existing ticket
                </label>
            </div>
            {mode === 'fake' ? (
                <input placeholder="Ticket title" value={title} onChange={(event) => setTitle(event.target.value)} />
            ) : (
                <select value={ticketId} onChange={(event) => setTicketId(event.target.value)}>
                    <option value="">Select a ticket…</option>
                    {tickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                            {ticket.id}: {ticket.title}
                        </option>
                    ))}
                </select>
            )}
            {hasUnsavedChanges && (
                <div className="muted">Tests run the saved version. Save first to test your changes.</div>
            )}
            <button
                className="primary"
                onClick={run}
                disabled={testModule.isPending || (mode === 'existing' ? !ticketId : !title.trim())}
            >
                {testModule.isPending ? 'Running…' : 'Run test'}
            </button>
            {testModule.error && <div className="error">{testModule.error.message}</div>}
        </section>
    );
}
