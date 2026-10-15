import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../api/auth';

export function RequireAuth({ children }: { children: ReactNode }) {
    const { data: user, isPending } = useCurrentUser();

    if (isPending) {
        return <div className="page-loading">Loading…</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
}
