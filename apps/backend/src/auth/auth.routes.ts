import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/database';

export const AUTH_COOKIE = 'tt_session';

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { userId: string; email: string };
        user: { userId: string; email: string };
    }
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        await request.jwtVerify();
    } catch {
        await reply.code(401).send({ error: 'Not logged in' });
    }
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
    app.post('/auth/login', async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Email and password are required' });
        }
        const user = await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', parsed.data.email.toLowerCase())
            .executeTakeFirst();
        if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
            return reply.code(401).send({ error: 'Wrong email or password' });
        }

        const token = await reply.jwtSign({ userId: user.id, email: user.email }, { expiresIn: '12h' });
        return reply
            .setCookie(AUTH_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax' })
            .send({ id: user.id, email: user.email, name: user.name });
    });

    app.post('/auth/logout', async (_request, reply) => {
        return reply.clearCookie(AUTH_COOKIE, { path: '/' }).send({ ok: true });
    });

    app.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
        const user = await db
            .selectFrom('users')
            .select(['id', 'email', 'name'])
            .where('id', '=', request.user.userId)
            .executeTakeFirst();
        if (!user) {
            return reply.code(401).send({ error: 'Not logged in' });
        }
        return user;
    });
}
