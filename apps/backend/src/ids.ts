import { randomBytes } from 'node:crypto';

export type IdPrefix = 'DS' | 'IW' | 'ACT' | 'MOD' | 'RUN' | 'USR';

export function newId(prefix: IdPrefix): string {
    return `${prefix}_${randomBytes(9).toString('base64url')}`;
}
