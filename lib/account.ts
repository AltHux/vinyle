import crypto from 'node:crypto';
import { db } from './db';
import { appUrl, buttonMail, sendMail } from './mail';

/** Minimalny wiek przy rejestracji (w Polsce zgoda na przetwarzanie danych od 16 lat). */
export const MIN_AGE = 16;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Wiek w pełnych latach dla daty w formacie RRRR-MM-DD, albo null przy złej dacie. */
export function ageFrom(birth: string, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age--;
  return age;
}

type Purpose = 'verify' | 'reset';
const TTL_HOURS: Record<Purpose, number> = { verify: 48, reset: 1 };

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Czy w ostatniej minucie wysłaliśmy już taki mail (ochrona przed zasypywaniem skrzynki). */
export function recentlySent(userId: number, purpose: Purpose) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM email_tokens WHERE user_id = ? AND purpose = ? AND created_at > datetime('now', '-60 seconds')")
      .get(userId, purpose),
  );
}

function createToken(userId: number, purpose: Purpose, email: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare("DELETE FROM email_tokens WHERE expires_at < datetime('now')").run();
  db.prepare(
    `INSERT INTO email_tokens (token_hash, user_id, purpose, email, expires_at)
     VALUES (?, ?, ?, ?, datetime('now', ?))`,
  ).run(sha(token), userId, purpose, email, `+${TTL_HOURS[purpose]} hours`);
  return token;
}

/** Ważny token (bez zużywania). */
export function findToken(token: string, purpose: Purpose) {
  return db
    .prepare("SELECT user_id, email FROM email_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > datetime('now')")
    .get(sha(token), purpose) as { user_id: number; email: string } | undefined;
}

export function deleteTokens(userId: number, purpose: Purpose) {
  db.prepare('DELETE FROM email_tokens WHERE user_id = ? AND purpose = ?').run(userId, purpose);
}

export async function sendVerification(userId: number, email: string) {
  const url = `${await appUrl()}/potwierdz?token=${createToken(userId, 'verify', email)}`;
  await sendMail({
    to: email,
    subject: 'Potwierdź adres e-mail w Vinyle',
    ...buttonMail(
      'Dzięki za założenie konta w Vinyle! Kliknij, żeby potwierdzić swój adres e-mail.',
      'Potwierdź adres',
      url,
      `Link jest ważny ${TTL_HOURS.verify} godziny. Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.`,
    ),
  });
}

export async function sendPasswordReset(userId: number, email: string) {
  const url = `${await appUrl()}/haslo/nowe?token=${createToken(userId, 'reset', email)}`;
  await sendMail({
    to: email,
    subject: 'Ustaw nowe hasło w Vinyle',
    ...buttonMail(
      'Ktoś (mamy nadzieję, że Ty) poprosił o zmianę hasła do konta w Vinyle.',
      'Ustaw nowe hasło',
      url,
      'Link jest ważny godzinę. Jeśli to nie Ty, zignoruj tę wiadomość, a hasło się nie zmieni.',
    ),
  });
}

/**
 * Potwierdza adres z linku. Token zostaje ważny do wygaśnięcia, więc ponowne kliknięcie
 * (albo wcześniejsze otwarcie linku przez skaner poczty) nie psuje potwierdzenia.
 */
export function confirmEmail(token: string): 'ok' | 'invalid' | 'taken' {
  const t = findToken(token, 'verify');
  if (!t) return 'invalid';
  const other = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(t.email, t.user_id);
  if (other) return 'taken';
  db.prepare(
    'UPDATE users SET email = ?, email_verified_at = COALESCE(CASE WHEN email = ? THEN email_verified_at END, CURRENT_TIMESTAMP) WHERE id = ?',
  ).run(t.email, t.email, t.user_id);
  return 'ok';
}
