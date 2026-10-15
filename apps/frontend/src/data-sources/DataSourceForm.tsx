import type { DataSource, DataSourceInput, DataSourceType } from '@tiny-tonkean/shared/data-sources';
import { type FormEvent, useState } from 'react';
import { useSaveDataSource } from '../api/data-sources';

const FIELDS: Record<DataSourceType, { key: string; label: string; secret?: boolean }[]> = {
    TICKETS: [
        { key: 'baseUrl', label: 'Base URL' },
        { key: 'apiToken', label: 'API token', secret: true },
    ],
    CHATTER: [
        { key: 'baseUrl', label: 'Base URL' },
        { key: 'apiToken', label: 'API token', secret: true },
    ],
};

const DEFAULTS: Record<DataSourceType, Record<string, string>> = {
    TICKETS: { baseUrl: 'http://tickets:4200', apiToken: '' },
    CHATTER: { baseUrl: 'http://chatter:4100', apiToken: '' },
};

interface Props {
    existing?: DataSource;
    onDone: () => void;
}

export function DataSourceForm({ existing, onDone }: Props) {
    const save = useSaveDataSource();
    const [type, setType] = useState<DataSourceType>(existing?.type ?? 'TICKETS');
    const [name, setName] = useState(existing?.name ?? '');
    const [values, setValues] = useState<Record<string, string>>(
        (existing?.config as Record<string, string> | undefined) ?? DEFAULTS.TICKETS,
    );

    const onTypeChange = (nextType: DataSourceType) => {
        setType(nextType);
        setValues(DEFAULTS[nextType]);
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const input = { type, name, config: values } as DataSourceInput;
        save.mutate({ id: existing?.id, input }, { onSuccess: onDone });
    };

    return (
        <form className="card form" onSubmit={onSubmit}>
            <h3>{existing ? `Edit ${existing.name}` : 'New data source'}</h3>
            <label>
                Type
                <select
                    value={type}
                    disabled={Boolean(existing)}
                    onChange={(event) => onTypeChange(event.target.value as DataSourceType)}
                >
                    <option value="TICKETS">Tickets</option>
                    <option value="CHATTER">Chatter</option>
                </select>
            </label>
            <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            {FIELDS[type].map((field) => (
                <label key={field.key}>
                    {field.label}
                    <input
                        type={field.secret ? 'password' : 'text'}
                        value={values[field.key] ?? ''}
                        onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                    />
                </label>
            ))}
            {save.error && <div className="error">{save.error.message}</div>}
            <div className="row">
                <button className="primary" type="submit" disabled={save.isPending}>
                    Save
                </button>
                <button type="button" onClick={onDone}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
