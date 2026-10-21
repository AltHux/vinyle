import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

const COOKIE = 'vinyle_session';

export type User = { id: number; username: string };

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token) as User | undefined;
  return row ?? null;
}

export async function requireUser(next = '/'): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/logowanie?next=${encodeURIComponent(next)}`);
  return user;
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  jar.delete(COOKIE);
}
