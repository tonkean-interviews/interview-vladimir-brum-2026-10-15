function env(name: string, fallback: string): string {
    return process.env[name] ?? fallback;
}

export const config = {
    port: Number(env('PORT', '4000')),
    db: {
        host: env('DB_HOST', 'localhost'),
        port: Number(env('DB_PORT', '3306')),
        user: env('DB_USER', 'tonkean'),
        password: env('DB_PASSWORD', 'tonkean'),
        database: env('DB_NAME', 'tonkean'),
    },
    jwtSecret: env('JWT_SECRET', 'local-dev-jwt-secret'),
    // The address Tickets uses to deliver webhooks to this backend.
    backendPublicUrl: env('BACKEND_PUBLIC_URL', 'http://localhost:4000'),
};
