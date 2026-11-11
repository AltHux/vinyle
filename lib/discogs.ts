import { db, slugify, uniqueSlug } from './db';

// Import albumów (masterów) i ich wydań winylowych z Discogs API.
// Limit API dla zalogowanych to 60 zapytań na minutę, więc import idzie w tle, krok po kroku.

const API = process.env.DISCOGS_API ?? 'https://api.discogs.com';
const DELAY_MS = Number(process.env.DISCOGS_DELAY_MS ?? 1100);
const MAX_VERSIONS = 100;

export const DISCOGS_GENRES = [
  'Rock', 'Electronic', 'Pop', 'Jazz', 'Funk / Soul', 'Hip Hop', 'Classical', 'Reggae',
  'Stage & Screen', 'Blues', 'Folk, World, & Country', 'Latin',
];

// Gatunki z Discogs na gatunki w Vinyle; Metal i Punk to w Discogs style rocka
const GENRE_MAP: Record<string, [string, string]> = {
  Rock: ['rock', 'Rock'],
  Electronic: ['elektronika', 'Elektronika'],
  Pop: ['pop', 'Pop'],
  Jazz: ['jazz', 'Jazz'],
  'Funk / Soul': ['soul-funk', 'Soul i funk'],
  'Hip Hop': ['hip-hop', 'Hip-hop'],
  Classical: ['klasyczna', 'Muzyka klasyczna'],
  Reggae: ['reggae', 'Reggae'],
  'Stage & Screen': ['filmowa', 'Muzyka filmowa'],
  Blues: ['blues', 'Blues'],
  'Folk, World, & Country': ['folk', 'Folk i country'],
  Latin: ['latin', 'Muzyka latynoska'],
};
const STYLE_MAP: [RegExp, [string, string]][] = [
  [/metal/i, ['metal', 'Metal']],
  [/punk|hardcore|new wave/i, ['punk', 'Punk i post-punk']],
];

export type ImportParams =
  | { mode: 'search'; genre?: string; style?: string; country?: string; yearFrom?: number; yearTo?: number; limit: number }
  // Po kolei każdy gatunek z DISCOGS_GENRES, do `limit` nowych płyt w każdym
  | { mode: 'all'; country?: string; yearFrom?: number; yearTo?: number; limit: number }
  | { mode: 'ids'; ids: number[] };

type Master = {
  id: number;
  title: string;
  year?: number;
  artists?: { name: string }[];
  genres?: string[];
  styles?: string[];
  tracklist?: { position?: string; title: string; type_?: string }[];
  images?: { type: string; uri: string }[];
  notes?: string;
};
type Version = {
  id: number;
  title?: string;
  format?: string;
  label?: string;
  country?: string;
  released?: string;
  catno?: string;
  major_formats?: string[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(path: string, attempt = 0): Promise<T> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) throw new Error('Brak zmiennej DISCOGS_TOKEN na serwerze.');
  await sleep(DELAY_MS);
  const res = await fetch(API + path, {
    headers: { Authorization: `Discogs token=${token}`, 'User-Agent': 'VinyleApp/1.0 +https://vinyle.onrender.com' },
  });
  if (res.status === 429 && attempt < 3) {
    await sleep(60_000);
    return api(path, attempt + 1);
  }
  if (res.status === 401) throw new Error('Discogs odrzucił token (401). Sprawdź DISCOGS_TOKEN.');
  if (!res.ok) throw new Error(`Discogs ${res.status} dla ${path}`);
  return res.json() as Promise<T>;
}

/** Nazwy wykonawców w Discogs mają dopiski „(2)” dla rozróżnienia imienników. */
const cleanArtist = (n: string) => n.replace(/\s\(\d+\)$/, '').replace(/^(.+), The$/, 'The $1').trim();

/** Wyciąga ID masterów z wklejonego tekstu: linki discogs.com/master/123 lub same liczby. */
export function parseMasterIds(text: string): number[] {
  const ids = new Set<number>();
  for (const m of text.matchAll(/master\/(\d+)|^\s*(\d+)\s*$/gim)) ids.add(Number(m[1] ?? m[2]));
  return [...ids];
}

function log(jobId: number, line: string) {
  db.prepare("UPDATE import_jobs SET log = substr(log || ? || char(10), -20000) WHERE id = ?").run(line, jobId);
}

function genreIds(master: Master) {
  const pairs = new Map<string, string>();
  for (const g of master.genres ?? []) {
    const m = GENRE_MAP[g] ?? [slugify(g), g];
    pairs.set(m[0], m[1]);
  }
  for (const s of master.styles ?? []) for (const [re, m] of STYLE_MAP) if (re.test(s)) pairs.set(m[0], m[1]);
  const find = db.prepare('SELECT id FROM genres WHERE slug = ?');
  const ins = db.prepare('INSERT INTO genres (name, slug) VALUES (?, ?)');
  return [...pairs].map(([slug, name]) => {
    const row = find.get(slug) as { id: number } | undefined;
    return row?.id ?? Number(ins.run(name, slug).lastInsertRowid);
  });
}

function saveMaster(master: Master, versions: Version[], userId: number) {
  const artistName = cleanArtist(master.artists?.[0]?.name ?? 'Nieznany wykonawca');
  const cover = master.images?.find((i) => i.type === 'primary')?.uri ?? master.images?.[0]?.uri ?? null;
  const vinyl = versions.filter((v) => !v.major_formats || v.major_formats.includes('Vinyl'));

  return db.transaction(() => {
    const artist = db.prepare('SELECT id FROM artists WHERE name = ?').get(artistName) as { id: number } | undefined;
    const artistId =
      artist?.id ??
      Number(db.prepare('INSERT INTO artists (name, slug) VALUES (?, ?)').run(artistName, uniqueSlug('artists', artistName)).lastInsertRowid);

    // Ten sam album mógł trafić do bazy ręcznie lub z danych startowych: dopinamy go zamiast dublować
    let album = db
      .prepare('SELECT id, cover_url FROM albums WHERE discogs_master_id = ? OR (artist_id = ? AND title = ? COLLATE NOCASE)')
      .get(master.id, artistId, master.title) as { id: number; cover_url: string | null } | undefined;
    let created = false;
    if (album) {
      db.prepare('UPDATE albums SET discogs_master_id = ?, cover_url = COALESCE(cover_url, ?), year = COALESCE(year, ?) WHERE id = ?')
        .run(master.id, cover, master.year || null, album.id);
    } else {
      const id = Number(
        db.prepare('INSERT INTO albums (title, slug, artist_id, year, cover_url, discogs_master_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(master.title, uniqueSlug('albums', `${artistName} ${master.title}`), artistId, master.year || null, cover, master.id, userId)
          .lastInsertRowid,
      );
      album = { id, cover_url: cover };
      created = true;
    }

    const insAG = db.prepare('INSERT OR IGNORE INTO album_genres (album_id, genre_id) VALUES (?, ?)');
    for (const g of genreIds(master)) insAG.run(album.id, g);

    const hasTracks = db.prepare('SELECT 1 FROM tracks WHERE album_id = ?').get(album.id);
    if (!hasTracks) {
      const insT = db.prepare('INSERT INTO tracks (album_id, position, title, sort) VALUES (?, ?, ?, ?)');
      (master.tracklist ?? [])
        .filter((t) => (t.type_ ?? 'track') === 'track')
        .forEach((t, i) => insT.run(album!.id, t.position || null, t.title, i));
    }

    const existingCat = new Set(
      (db.prepare('SELECT catalog_no FROM releases WHERE album_id = ? AND catalog_no IS NOT NULL').all(album.id) as { catalog_no: string }[])
        .map((r) => r.catalog_no.replace(/\s/g, '').toLowerCase()),
    );
    const insR = db.prepare(
      `INSERT OR IGNORE INTO releases (album_id, label, catalog_no, country, year, format, discogs_release_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let releases = 0;
    for (const v of vinyl) {
      const catno = v.catno && v.catno !== 'none' ? v.catno : null;
      if (catno && existingCat.has(catno.replace(/\s/g, '').toLowerCase())) continue;
      const year = parseInt(v.released ?? '', 10) || null;
      releases += insR.run(album.id, v.label ?? null, catno, v.country ?? null, year, v.format ?? null, v.id, userId).changes;
    }
    return { created, releases };
  })();
}

async function importMaster(jobId: number, masterId: number, userId: number) {
  const master = await api<Master>(`/masters/${masterId}`);
  const versions = await api<{ versions: Version[] }>(
    `/masters/${masterId}/versions?format=Vinyl&sort=released&sort_order=asc&per_page=${MAX_VERSIONS}`,
  );
  const { created, releases } = saveMaster(master, versions.versions ?? [], userId);
  const name = `${cleanArtist(master.artists?.[0]?.name ?? '?')} – ${master.title}`;
  log(jobId, `${created ? '+' : '~'} ${name} (${releases} wydań)`);
  return created;
}

async function* searchMasters(p: Omit<Extract<ImportParams, { mode: 'search' }>, 'mode'>) {
  const q = new URLSearchParams({ type: 'master', format: 'Vinyl', per_page: '100', sort: 'have', sort_order: 'desc' });
  if (p.genre) q.set('genre', p.genre);
  if (p.style) q.set('style', p.style);
  if (p.country) q.set('country', p.country);
  if (p.yearFrom || p.yearTo) q.set('year', `${p.yearFrom ?? 1900}-${p.yearTo ?? new Date().getFullYear()}`);
  for (let page = 1; ; page++) {
    q.set('page', String(page));
    const res = await api<{ results: { id: number; type: string }[]; pagination: { pages: number } }>(`/database/search?${q}`);
    for (const r of res.results) if (r.type === 'master') yield r.id;
    if (page >= res.pagination.pages) return;
  }
}

const stopRequested = new Set<number>();
export function stopImport(jobId: number) {
  stopRequested.add(jobId);
}

/** Uruchamia import w tle i od razu zwraca ID zadania. */
export function startImport(params: ImportParams, userId: number) {
  const running = db.prepare("SELECT id FROM import_jobs WHERE status = 'running'").get();
  if (running) throw new Error('Inny import jeszcze trwa. Poczekaj, aż się skończy, albo go zatrzymaj.');
  if (!process.env.DISCOGS_TOKEN) throw new Error('Brak zmiennej DISCOGS_TOKEN na serwerze. Dodaj ją w ustawieniach Render.');
  const total = params.mode === 'ids' ? params.ids.length : params.mode === 'all' ? params.limit * DISCOGS_GENRES.length : params.limit;
  const jobId = Number(
    db.prepare('INSERT INTO import_jobs (params, total, created_by) VALUES (?, ?, ?)').run(JSON.stringify(params), total, userId).lastInsertRowid,
  );

  void (async () => {
    const seen = new Set<number>();
    const known = db.prepare('SELECT 1 FROM albums WHERE discogs_master_id = ?');
    const bump = (col: 'imported' | 'skipped') => db.prepare(`UPDATE import_jobs SET ${col} = ${col} + 1 WHERE id = ?`).run(jobId);
    const stopped = () => {
      if (!stopRequested.has(jobId)) return false;
      db.prepare("UPDATE import_jobs SET status = 'stopped', finished_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
      return true;
    };
    // Importuje płyty z listy lub wyszukiwania, aż przybędzie `limit` nowych; zwraca false po zatrzymaniu
    const run = async (ids: Iterable<number> | AsyncIterable<number>, limit: number, skipKnown: boolean) => {
      let added = 0;
      for await (const id of ids) {
        if (stopped()) return false;
        if (seen.has(id)) continue;
        seen.add(id);
        // W wyszukiwaniu pomijamy płyty, które już są, żeby limit dotyczył nowych
        if (skipKnown && known.get(id)) continue;
        try {
          const created = await importMaster(jobId, id, userId);
          bump(created ? 'imported' : 'skipped');
          if (created) added++;
        } catch (e) {
          if (e instanceof Error && /token|DISCOGS_TOKEN/.test(e.message)) throw e;
          log(jobId, `! master ${id}: ${(e as Error).message}`);
          bump('skipped');
        }
        if (added >= limit) break;
      }
      return true;
    };
    try {
      if (params.mode === 'ids') {
        if (!(await run(params.ids, Infinity, false))) return;
      } else if (params.mode === 'search') {
        if (!(await run(searchMasters(params), params.limit, true))) return;
      } else {
        for (const genre of DISCOGS_GENRES) {
          log(jobId, `== ${genre}`);
          if (!(await run(searchMasters({ ...params, genre }), params.limit, true))) return;
        }
      }
      db.prepare("UPDATE import_jobs SET status = 'done', finished_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
    } catch (e) {
      log(jobId, `! ${(e as Error).message}`);
      db.prepare("UPDATE import_jobs SET status = 'failed', finished_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
    } finally {
      stopRequested.delete(jobId);
    }
  })();
  return jobId;
}
