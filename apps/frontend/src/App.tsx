import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { DataSourcesPage } from './data-sources/DataSourcesPage';
import { AppLayout } from './layout/AppLayout';
import { ModuleEditorPage } from './modules/editor/ModuleEditorPage';
import { ModulesPage } from './modules/ModulesPage';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1 } },
});

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        element={
                            <RequireAuth>
                                <AppLayout />
                            </RequireAuth>
                        }
                    >
                        <Route path="/modules" element={<ModulesPage />} />
                        <Route path="/modules/:moduleId" element={<ModuleEditorPage />} />
                        <Route path="/data-sources" element={<DataSourcesPage />} />
                        <Route path="*" element={<Navigate to="/modules" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
