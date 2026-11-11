import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed';

const DB_PATH = process.env.VINYLE_DB ?? path.join(process.cwd(), 'data', 'vinyle.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  slug TEXT NOT NULL UNIQUE,
  country TEXT
);
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  artist_id INTEGER NOT NULL REFERENCES artists(id),
  year INTEGER,
  description TEXT,
  cover_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS album_genres (
  album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (album_id, genre_id)
);
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY,
  album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  position TEXT,
  title TEXT NOT NULL,
  sort INTEGER NOT NULL
);
-- Wydania (pressingi) danego albumu
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY,
  album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  label TEXT,
  catalog_no TEXT,
  country TEXT,
  year INTEGER,
  format TEXT,
  vinyl_color TEXT,
  notes TEXT,
  cover_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Półka użytkownika na poziomie albumu: status, ocena, opinia
CREATE TABLE IF NOT EXISTS shelf (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('mam', 'chce', 'sluchalem')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  review TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, album_id)
);
-- Konkretne wydania, które użytkownik ma lub chce kupić
CREATE TABLE IF NOT EXISTS user_releases (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('mam', 'chce')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, release_id)
);
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_releases_album ON releases(album_id);
CREATE INDEX IF NOT EXISTS idx_shelf_album ON shelf(album_id);
`;

// Kolumny dodane po pierwszym wdrożeniu; CREATE TABLE IF NOT EXISTS ich nie doda do istniejącej bazy
function migrate(db: Database.Database) {
  const has = (table: string, col: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === col);
  if (!has('albums', 'discogs_master_id')) db.exec('ALTER TABLE albums ADD COLUMN discogs_master_id INTEGER');
  if (!has('releases', 'discogs_release_id')) db.exec('ALTER TABLE releases ADD COLUMN discogs_release_id INTEGER');
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_discogs ON albums(discogs_master_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_releases_discogs ON releases(discogs_release_id);
    CREATE TABLE IF NOT EXISTS import_jobs (
      id INTEGER PRIMARY KEY,
      params TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed', 'stopped')),
      total INTEGER NOT NULL DEFAULT 0,
      imported INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      log TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT
    );
    -- Import przerwany restartem serwera nie wznowi się sam
    UPDATE import_jobs SET status = 'stopped', finished_at = CURRENT_TIMESTAMP WHERE status = 'running';
  `);
}

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  // Kilka procesów (np. workery buildu) może startować równocześnie, więc sprawdzamy w transakcji z blokadą
  db.transaction(() => {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM genres').get() as { n: number };
    if (n === 0) seed(db);
  }).immediate();
  return db;
}

// Jedno połączenie na proces (także przy hot-reloadzie w trybie dev)
const g = globalThis as unknown as { __vinyleDb?: Database.Database };
export const db = g.__vinyleDb ?? (g.__vinyleDb = open());

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'x';
}

export function uniqueSlug(table: 'albums' | 'artists', base: string) {
  let slug = slugify(base);
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`);
  for (let i = 2; exists.get(slug); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

export type Status = 'mam' | 'chce' | 'sluchalem';
export const STATUS_LABEL: Record<Status, string> = {
  mam: 'Mam',
  chce: 'Chcę kupić',
  sluchalem: 'Słuchałem',
};

export type AlbumCard = {
  id: number;
  title: string;
  slug: string;
  year: number | null;
  cover_url: string | null;
  artist: string;
  artist_slug: string;
  avg_rating: number | null;
  ratings: number;
  owners: number;
};

export const ALBUM_CARD_SQL = `
  SELECT a.id, a.title, a.slug, a.year, a.cover_url, a.created_at,
         ar.name AS artist, ar.slug AS artist_slug,
         (SELECT ROUND(AVG(rating), 1) FROM shelf s WHERE s.album_id = a.id AND rating IS NOT NULL) AS avg_rating,
         (SELECT COUNT(rating) FROM shelf s WHERE s.album_id = a.id) AS ratings,
         (SELECT COUNT(*) FROM shelf s WHERE s.album_id = a.id AND status = 'mam') AS owners
  FROM albums a JOIN artists ar ON ar.id = a.artist_id
`;
