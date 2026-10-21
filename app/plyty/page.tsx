import Link from 'next/link';
import { ALBUM_CARD_SQL, db, type AlbumCard } from '@/lib/db';
import { AlbumGrid } from '@/components/AlbumGrid';

export const metadata = { title: 'Katalog płyt' };

const SORTS = {
  popularne: 'owners DESC, ratings DESC, a.title',
  ocena: 'avg_rating IS NULL, avg_rating DESC, ratings DESC',
  rok_desc: 'a.year IS NULL, a.year DESC',
  rok_asc: 'a.year IS NULL, a.year ASC',
  tytul: 'a.title COLLATE NOCASE',
  nowe: 'a.created_at DESC, a.id DESC',
} as const;
const SORT_LABEL: Record<keyof typeof SORTS, string> = {
  popularne: 'Najpopularniejsze',
  ocena: 'Najwyżej oceniane',
  rok_desc: 'Najnowsze wydawniczo',
  rok_asc: 'Najstarsze wydawniczo',
  tytul: 'Tytuł A–Z',
  nowe: 'Ostatnio dodane',
};

type SP = Promise<{ q?: string; g?: string; sort?: string; dekada?: string }>;

export default async function Catalog({ searchParams }: { searchParams: SP }) {
  const { q = '', g = '', sort = 'popularne', dekada = '' } = await searchParams;
  const sortKey = (sort in SORTS ? sort : 'popularne') as keyof typeof SORTS;

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    where.push('(a.title LIKE ? OR ar.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (g) {
    where.push('a.id IN (SELECT album_id FROM album_genres ag JOIN genres gg ON gg.id = ag.genre_id WHERE gg.slug = ?)');
    params.push(g);
  }
  const dec = parseInt(dekada, 10);
  if (dec) {
    where.push('a.year BETWEEN ? AND ?');
    params.push(dec, dec + 9);
  }
  const albums = db
    .prepare(`SELECT * FROM (${ALBUM_CARD_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}) a ORDER BY ${SORTS[sortKey].replace(/a\./g, '')}`)
    .all(...params) as AlbumCard[];

  const genres = db
    .prepare('SELECT g.name, g.slug, COUNT(ag.album_id) n FROM genres g LEFT JOIN album_genres ag ON ag.genre_id = g.id GROUP BY g.id ORDER BY g.name')
    .all() as { name: string; slug: string; n: number }[];
  const decades = db
    .prepare('SELECT (year / 10) * 10 AS d, COUNT(*) n FROM albums WHERE year IS NOT NULL GROUP BY d ORDER BY d')
    .all() as { d: number; n: number }[];

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, g, sort, dekada, ...patch });
    for (const [k, v] of [...p]) if (!v || (k === 'sort' && v === 'popularne')) p.delete(k);
    const s = p.toString();
    return `/plyty${s ? '?' + s : ''}`;
  };
  const genreName = genres.find((x) => x.slug === g)?.name;

  return (
    <div className="catalog">
      <aside className="sidebar">
        <h3 style={{ marginTop: 0 }}>Gatunek</h3>
        <ul>
          <li><Link href={link({ g: '' })} className={!g ? 'active' : ''}>Wszystkie</Link></li>
          {genres.map((x) => (
            <li key={x.slug}>
              <Link href={link({ g: x.slug })} className={g === x.slug ? 'active' : ''}>
                {x.name} <span className="muted">{x.n}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h3>Dekada</h3>
        <ul>
          <li><Link href={link({ dekada: '' })} className={!dec ? 'active' : ''}>Wszystkie</Link></li>
          {decades.map((d) => (
            <li key={d.d}>
              <Link href={link({ dekada: String(d.d) })} className={dec === d.d ? 'active' : ''}>
                {d.d}s <span className="muted">{d.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section>
        <h1>{genreName ?? (q ? `Wyniki dla „${q}”` : 'Katalog płyt')}</h1>
        <div className="toolbar">
          <span className="muted">{albums.length} {albums.length === 1 ? 'płyta' : 'płyt'}</span>
          <form>
            {q && <input type="hidden" name="q" value={q} />}
            {g && <input type="hidden" name="g" value={g} />}
            {dekada && <input type="hidden" name="dekada" value={dekada} />}
            <label htmlFor="sort" className="muted small">Sortuj</label>
            <select id="sort" name="sort" defaultValue={sortKey}>
              {Object.entries(SORT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn btn-small btn-ghost">OK</button>
          </form>
        </div>
        <AlbumGrid albums={albums} />
        {albums.length === 0 && (
          <p>Nie ma tej płyty w bazie? <Link href="/dodaj" style={{ color: 'var(--accent)' }}>Dodaj ją</Link>.</p>
        )}
      </section>
    </div>
  );
}
