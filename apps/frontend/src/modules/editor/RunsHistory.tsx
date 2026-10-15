import type { ModuleRun } from '@tiny-tonkean/shared/runs';
import { useModuleRuns } from '../../api/modules';

interface Props {
    moduleId: string;
    selectedRunId: string | null;
    onSelect: (run: ModuleRun) => void;
}

export function RunsHistory({ moduleId, selectedRunId, onSelect }: Props) {
    const { data: runs = [], error } = useModuleRuns(moduleId);

    return (
        <section className="panel-section">
            <h4>Run history</h4>
            {error && <div className="error">{error.message}</div>}
            {runs.length === 0 && <div className="muted">No runs yet</div>}
            <ul className="runs">
                {runs.map((run) => (
                    <li key={run.id}>
                        <button
                            className={run.id === selectedRunId ? 'run-item selected' : 'run-item'}
                            onClick={() => onSelect(run)}
                        >
                            <span
                                className={`badge ${run.status === 'SUCCESS' ? 'success' : run.status === 'FAILED' ? 'danger' : ''}`}
                            >
                                {run.status}
                            </span>
                            <span>{run.isTest ? 'Test' : 'Webhook'}</span>
                            <span className="muted">{String(run.triggerPayload.id ?? '')}</span>
                            <time className="muted">{new Date(run.startedAt).toLocaleTimeString()}</time>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
