import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../api/auth';

export function LoginPage() {
    const navigate = useNavigate();
    const login = useLogin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        login.mutate({ email, password }, { onSuccess: () => navigate('/modules') });
    };

    return (
        <div className="login-page">
            <form className="card login-card" onSubmit={onSubmit}>
                <h1>Tiny Tonkean</h1>
                <label>
                    Email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus />
                </label>
                <label>
                    Password
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                {login.error && <div className="error">{login.error.message}</div>}
                <button className="primary" type="submit" disabled={login.isPending}>
                    {login.isPending ? 'Logging in…' : 'Log in'}
                </button>
            </form>
        </div>
    );
}
