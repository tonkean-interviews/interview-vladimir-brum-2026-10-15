import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../api/auth';

export function AppLayout() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const logout = useLogout();

    return (
        <div className="app">
            <header className="topbar">
                <span className="brand">Tiny Tonkean</span>
                <nav>
                    <NavLink to="/modules">Modules</NavLink>
                    <NavLink to="/data-sources">Data Sources</NavLink>
                </nav>
                <div className="topbar-user">
                    <span>{user?.email}</span>
                    <button onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}>
                        Log out
                    </button>
                </div>
            </header>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}
