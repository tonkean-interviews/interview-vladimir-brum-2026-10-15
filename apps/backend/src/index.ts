import { buildApp } from './app';
import { bootstrap } from './bootstrap';
import { config } from './config';

const app = await buildApp();

// Listen first: Tickets sends the webhook.ping confirmation to us while webhooks are being registered.
await app.listen({ port: config.port, host: '0.0.0.0' });

try {
    await bootstrap(app.log);
    app.log.info('Bootstrap finished');
} catch (error) {
    app.log.error({ err: error }, 'Bootstrap failed');
    process.exit(1);
}
