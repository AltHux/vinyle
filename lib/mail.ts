import { headers } from 'next/headers';

/**
 * Wysyłka maili przez Resend (https://resend.com), zwykłym zapytaniem HTTP.
 * RESEND_API_KEY – klucz API, MAIL_FROM – nadawca (np. "Vinyle <konto@mojevinyle.pl>", domena zweryfikowana w Resend).
 * Bez klucza mail nie wychodzi, a jego treść (z linkiem) trafia do logów serwera – wygodne lokalnie.
 */
export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.log(`[mail] RESEND_API_KEY nie ustawiony, mail niewysłany.\nDo: ${to}\nTemat: ${subject}\n${text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? 'Vinyle <onboarding@resend.dev>', to: [to], subject, text, html }),
  });
  if (!res.ok) {
    console.error(`[mail] Resend ${res.status}: ${await res.text()}`);
    throw new Error('Nie udało się wysłać maila. Spróbuj za chwilę.');
  }
}

/** Adres strony do linków w mailach: APP_URL albo adres, pod którym przyszło żądanie. */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Prosty mail z jednym przyciskiem. */
export function buttonMail(intro: string, button: string, url: string, outro: string) {
  const text = `${intro}\n\n${button}: ${url}\n\n${outro}\n\n– Vinyle`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222;line-height:1.5">
<h2 style="font-family:Georgia,serif">Vinyle</h2>
<p>${esc(intro)}</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#c2410c;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(button)}</a></p>
<p style="font-size:13px;color:#666">Jeśli przycisk nie działa, skopiuj adres: ${esc(url)}</p>
<p style="font-size:13px;color:#666">${esc(outro)}</p>
</div>`;
  return { text, html };
}
