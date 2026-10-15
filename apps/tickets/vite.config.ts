import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    build: { outDir: 'dist/web', emptyOutDir: true },
    server: {
        port: 4201,
        proxy: { '/api': 'http://localhost:4200' },
    },
});
