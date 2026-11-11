'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, uniqueSlug, type Status } from '@/lib/db';
import { currentUser, endSession, isAdmin, requireUser, startSession } from '@/lib/auth';
import type { ImportParams } from '@/lib/discogs';
import { hashPassword, verifyPassword } from '@/lib/password';

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const optInt = (fd: FormData, k: string) => {
  const n = parseInt(str(fd, k), 10);
  return Number.isFinite(n) ? n : null;
};
const safeNext = (n: string) => (n.startsWith('/') && !n.startsWith('//') ? n : '/');

// ---------- Konto ----------

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const username = str(fd, 'username');
  const password = str(fd, 'password');
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username))
    return { error: 'Nazwa użytkownika: 3–30 znaków, litery, cyfry, _ . -' };
  if (password.length < 8) return { error: 'Hasło musi mieć co najmniej 8 znaków.' };
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username))
    return { error: 'Ta nazwa użytkownika jest już zajęta.' };
  const id = Number(
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashPassword(password)).lastInsertRowid,
  );
  await startSession(id);
  redirect(safeNext(str(fd, 'next')));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const row = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(str(fd, 'username')) as
    | { id: number; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(str(fd, 'password'), row.password_hash))
    return { error: 'Nieprawidłowa nazwa użytkownika lub hasło.' };
  await startSession(row.id);
  redirect(safeNext(str(fd, 'next')));
}

export async function logout() {
  await endSession();
  redirect('/');
}

// ---------- Półka ----------

function albumSlug(albumId: number) {
  return (db.prepare('SELECT slug FROM albums WHERE id = ?').get(albumId) as { slug: string } | undefined)?.slug;
}

/** Status, ocena i opinia dla albumu. */
export async function saveShelf(fd: FormData) {
  const albumId = optInt(fd, 'album_id');
  const slug = albumId && albumSlug(albumId);
  if (!albumId || !slug) return;
  const user = await requireUser(`/plyta/${slug}`);

  const rawStatus = str(fd, 'status');
  const status = (['mam', 'chce', 'sluchalem'] as const).includes(rawStatus as Status) ? rawStatus : null;
  const rating = optInt(fd, 'rating');
  const review = optStr(fd, 'review');

  if (!status && !rating && !review) {
    db.prepare('DELETE FROM shelf WHERE user_id = ? AND album_id = ?').run(user.id, albumId);
  } else {
    db.prepare(
      `INSERT INTO shelf (user_id, album_id, status, rating, review, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, album_id) DO UPDATE SET
         status = excluded.status, rating = excluded.rating, review = excluded.review, updated_at = CURRENT_TIMESTAMP`,
    ).run(user.id, albumId, status, rating && rating >= 1 && rating <= 10 ? rating : null, review);
  }
  revalidatePath(`/plyta/${slug}`);
}

/** Szybka zmiana samego statusu (np. z listy). */
export async function setStatus(fd: FormData) {
  const albumId = optInt(fd, 'album_id');
  const slug = albumId && albumSlug(albumId);
  if (!albumId || !slug) return;
  const user = await requireUser(`/plyta/${slug}`);
  const status = str(fd, 'status');
  if (status === 'usun') {
    db.prepare('UPDATE shelf SET status = NULL WHERE user_id = ? AND album_id = ?').run(user.id, albumId);
  } else if (['mam', 'chce', 'sluchalem'].includes(status)) {
    db.prepare(
      `INSERT INTO shelf (user_id, album_id, status) VALUES (?, ?, ?)
       ON CONFLICT (user_id, album_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`,
    ).run(user.id, albumId, status);
  }
  revalidatePath('/', 'layout');
}

/** Mam / chcę konkretne wydanie (pressing). Ustawia też status albumu, jeśli to ma sens. */
export async function toggleRelease(fd: FormData) {
  const releaseId = optInt(fd, 'release_id');
  const rel = releaseId
    ? (db.prepare('SELECT r.album_id, a.slug FROM releases r JOIN albums a ON a.id = r.album_id WHERE r.id = ?').get(releaseId) as
        | { album_id: number; slug: string }
        | undefined)
    : undefined;
  if (!releaseId || !rel) return;
  const user = await requireUser(`/plyta/${rel.slug}`);
  const status = str(fd, 'status') as 'mam' | 'chce';
  if (status !== 'mam' && status !== 'chce') return;

  const existing = db
    .prepare('SELECT status FROM user_releases WHERE user_id = ? AND release_id = ?')
    .get(user.id, releaseId) as { status: string } | undefined;

  db.transaction(() => {
    if (existing?.status === status) {
      db.prepare('DELETE FROM user_releases WHERE user_id = ? AND release_id = ?').run(user.id, releaseId);
      return;
    }
    db.prepare(
      `INSERT INTO user_releases (user_id, release_id, status) VALUES (?, ?, ?)
       ON CONFLICT (user_id, release_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`,
    ).run(user.id, releaseId, status);
    // Posiadanie wydania => album "mam"; chęć kupna => "chcę", o ile jeszcze go nie masz
    const albumStatus = (db.prepare('SELECT status FROM shelf WHERE user_id = ? AND album_id = ?').get(user.id, rel.album_id) as
      | { status: string | null }
      | undefined)?.status;
    const next = status === 'mam' ? 'mam' : albumStatus === 'mam' ? 'mam' : 'chce';
    db.prepare(
      `INSERT INTO shelf (user_id, album_id, status) VALUES (?, ?, ?)
       ON CONFLICT (user_id, album_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`,
    ).run(user.id, rel.album_id, next);
  })();
  revalidatePath(`/plyta/${rel.slug}`);
}

// ---------- Dodawanie do bazy ----------

export async function addAlbum(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: 'Zaloguj się, aby dodać płytę.' };
  const title = str(fd, 'title');
  const artistName = str(fd, 'artist');
  if (!title || !artistName) return { error: 'Podaj tytuł i wykonawcę.' };
  const genreIds = fd.getAll('genres').map(Number).filter(Boolean);
  if (genreIds.length === 0) return { error: 'Wybierz co najmniej jeden gatunek.' };
  const coverUrl = optStr(fd, 'cover_url');
  if (coverUrl && !/^https?:\/\//.test(coverUrl)) return { error: 'Adres okładki musi zaczynać się od http(s)://' };

  const slug = db.transaction(() => {
    const existing = db.prepare('SELECT id FROM artists WHERE name = ?').get(artistName) as { id: number } | undefined;
    const artistId =
      existing?.id ??
      Number(
        db.prepare('INSERT INTO artists (name, slug, country) VALUES (?, ?, ?)')
          .run(artistName, uniqueSlug('artists', artistName), optStr(fd, 'country')).lastInsertRowid,
      );
    const slug = uniqueSlug('albums', `${artistName} ${title}`);
    const albumId = Number(
      db.prepare('INSERT INTO albums (title, slug, artist_id, year, description, cover_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(title, slug, artistId, optInt(fd, 'year'), optStr(fd, 'description'), coverUrl, user.id).lastInsertRowid,
    );
    const insAG = db.prepare('INSERT OR IGNORE INTO album_genres (album_id, genre_id) VALUES (?, ?)');
    for (const g of genreIds) insAG.run(albumId, g);
    str(fd, 'tracks')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line, i) => {
        const m = line.match(/^([A-Z]?\d+[a-z]?|[A-Z]\d*)[.)]?\s+(.+)$/);
        db.prepare('INSERT INTO tracks (album_id, position, title, sort) VALUES (?, ?, ?, ?)')
          .run(albumId, m ? m[1] : null, m ? m[2] : line, i);
      });
    return slug;
  })();
  redirect(`/plyta/${slug}`);
}

export async function addRelease(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: 'Zaloguj się, aby dodać wydanie.' };
  const albumId = optInt(fd, 'album_id');
  const slug = albumId && albumSlug(albumId);
  if (!albumId || !slug) return { error: 'Nie ma takiej płyty.' };
  const label = optStr(fd, 'label');
  const format = optStr(fd, 'format');
  if (!label && !format) return { error: 'Podaj co najmniej wytwórnię albo format.' };
  const coverUrl = optStr(fd, 'cover_url');
  if (coverUrl && !/^https?:\/\//.test(coverUrl)) return { error: 'Adres okładki musi zaczynać się od http(s)://' };
  db.prepare(
    `INSERT INTO releases (album_id, label, catalog_no, country, year, format, vinyl_color, notes, cover_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(albumId, label, optStr(fd, 'catalog_no'), optStr(fd, 'country'), optInt(fd, 'year'), format,
    optStr(fd, 'vinyl_color'), optStr(fd, 'notes'), coverUrl, user.id);
  revalidatePath(`/plyta/${slug}`);
  redirect(`/plyta/${slug}#wydania`);
}

export async function setCover(fd: FormData) {
  const albumId = optInt(fd, 'album_id');
  const slug = albumId && albumSlug(albumId);
  if (!albumId || !slug) return;
  await requireUser(`/plyta/${slug}`);
  const url = optStr(fd, 'cover_url');
  if (url && !/^https?:\/\//.test(url)) return;
  db.prepare('UPDATE albums SET cover_url = ? WHERE id = ?').run(url, albumId);
  revalidatePath('/', 'layout');
}

// ---------- Import z Discogs (tylko administratorzy) ----------

export async function startDiscogsImport(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!isAdmin(user)) return { error: 'Import jest dostępny tylko dla administratorów.' };
  const { startImport, parseMasterIds } = await import('@/lib/discogs');
  let params: ImportParams;
  if (str(fd, 'mode') === 'ids') {
    const ids = parseMasterIds(str(fd, 'ids'));
    if (ids.length === 0) return { error: 'Wklej linki do masterów z Discogs (discogs.com/master/…) albo ich numery.' };
    if (ids.length > 500) return { error: 'Maksymalnie 500 płyt naraz.' };
    params = { mode: 'ids', ids };
  } else {
    const limit = Math.min(Math.max(optInt(fd, 'limit') ?? 50, 1), 2000);
    const common = {
      limit, country: optStr(fd, 'country') ?? undefined,
      yearFrom: optInt(fd, 'year_from') ?? undefined, yearTo: optInt(fd, 'year_to') ?? undefined,
    };
    if (str(fd, 'genre') === '__all__') {
      params = { mode: 'all', ...common };
    } else {
    params = {
      mode: 'search', limit,
      genre: optStr(fd, 'genre') ?? undefined, style: optStr(fd, 'style') ?? undefined,
      country: optStr(fd, 'country') ?? undefined,
      yearFrom: optInt(fd, 'year_from') ?? undefined, yearTo: optInt(fd, 'year_to') ?? undefined,
    };
    if (!params.genre && !params.style && !params.country) return { error: 'Wybierz gatunek, styl albo kraj.' };
    }
  }
  try {
    startImport(params, user!.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath('/admin/import');
  return undefined;
}

export async function stopDiscogsImport(fd: FormData) {
  const user = await currentUser();
  if (!isAdmin(user)) return;
  const { stopImport } = await import('@/lib/discogs');
  const id = optInt(fd, 'job_id');
  if (id) stopImport(id);
  revalidatePath('/admin/import');
}
