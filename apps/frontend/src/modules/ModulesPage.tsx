import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateModule, useDeleteModule, useModules } from '../api/modules';

export function ModulesPage() {
    const navigate = useNavigate();
    const { data: modules, isPending, error } = useModules();
    const createModule = useCreateModule();
    const deleteModule = useDeleteModule();
    const [name, setName] = useState('');

    const onCreate = (event: FormEvent) => {
        event.preventDefault();
        createModule.mutate(name, { onSuccess: (module) => navigate(`/modules/${module.id}`) });
    };

    return (
        <div className="page">
            <h2>Modules</h2>
            <form className="row" onSubmit={onCreate}>
                <input placeholder="New module name" value={name} onChange={(event) => setName(event.target.value)} />
                <button className="primary" type="submit" disabled={!name.trim() || createModule.isPending}>
                    Create module
                </button>
            </form>
            {isPending && <div>Loading…</div>}
            {error && <div className="error">{error.message}</div>}
            <table className="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {modules?.map((module) => (
                        <tr key={module.id}>
                            <td>
                                <Link to={`/modules/${module.id}`}>{module.name}</Link>
                            </td>
                            <td>
                                <span className={module.isPublished ? 'badge success' : 'badge'}>
                                    {module.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </td>
                            <td>{new Date(module.updatedAt).toLocaleString()}</td>
                            <td>
                                <button
                                    className="danger"
                                    onClick={() => confirm(`Delete ${module.name}?`) && deleteModule.mutate(module.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
