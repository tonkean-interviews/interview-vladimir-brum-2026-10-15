import { Kysely, MysqlDialect, sql } from 'kysely';
import { createPool } from 'mysql2';
import { config } from '../config';
import type { Database } from './types';

export const db = new Kysely<Database>({
    dialect: new MysqlDialect({
        pool: createPool({
            ...config.db,
            connectionLimit: 10,
            timezone: 'Z',
        }),
    }),
});

export async function pingDatabase(): Promise<void> {
    await sql`SELECT 1`.execute(db);
}
