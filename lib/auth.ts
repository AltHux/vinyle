import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

const COOKIE = 'vinyle_session';

export type User = { id: number; username: string; avatar: string | null };

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare('SELECT u.id, u.username, u.avatar FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
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

/** Wylogowuje ze wszystkich urządzeń (np. po zmianie hasła), opcjonalnie poza bieżącą sesją. */
export async function endOtherSessions(userId: number) {
  const token = (await cookies()).get(COOKIE)?.value ?? '';
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, token);
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  jar.delete(COOKIE);
}

/** Administratorzy to nazwy użytkowników z ADMIN_USERS (po przecinku). */
export function isAdmin(user: User | null) {
  if (!user) return false;
  const admins = (process.env.ADMIN_USERS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes(user.username.toLowerCase());
}
