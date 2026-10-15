import type { DataSource } from '@tiny-tonkean/shared/data-sources';
import { useState } from 'react';
import { useDataSources, useDeleteDataSource, useTestConnection } from '../api/data-sources';
import { DataSourceForm } from './DataSourceForm';
import { WebhookPanel } from './WebhookPanel';

function DataSourceCard({ dataSource, onEdit }: { dataSource: DataSource; onEdit: () => void }) {
    const testConnection = useTestConnection();
    const deleteDataSource = useDeleteDataSource();

    return (
        <div className="card">
            <div className="row space-between">
                <div>
                    <h3>{dataSource.name}</h3>
                    <span className="muted">{dataSource.type === 'TICKETS' ? 'Tickets' : 'Chatter'}</span>
                </div>
                <div className="row">
                    <button onClick={() => testConnection.mutate(dataSource.id)} disabled={testConnection.isPending}>
                        Test connection
                    </button>
                    <button onClick={onEdit}>Edit</button>
                    <button
                        className="danger"
                        onClick={() => confirm(`Delete ${dataSource.name}?`) && deleteDataSource.mutate(dataSource.id)}
                    >
                        Delete
                    </button>
                </div>
            </div>
            {testConnection.data && (
                <div className={testConnection.data.ok ? 'success-text' : 'error'}>
                    {testConnection.data.ok ? 'Connection works' : testConnection.data.error}
                </div>
            )}
            {dataSource.type === 'TICKETS' && <WebhookPanel dataSourceId={dataSource.id} />}
        </div>
    );
}

export function DataSourcesPage() {
    const { data: dataSources, isPending, error } = useDataSources();
    const [editing, setEditing] = useState<DataSource | 'new' | null>(null);

    return (
        <div className="page">
            <div className="row space-between">
                <h2>Data Sources</h2>
                <button className="primary" onClick={() => setEditing('new')}>
                    Add data source
                </button>
            </div>
            {editing && (
                <DataSourceForm existing={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
            )}
            {isPending && <div>Loading…</div>}
            {error && <div className="error">{error.message}</div>}
            {dataSources?.map((dataSource) => (
                <DataSourceCard key={dataSource.id} dataSource={dataSource} onEdit={() => setEditing(dataSource)} />
            ))}
        </div>
    );
}
