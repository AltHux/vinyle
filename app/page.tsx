import Link from 'next/link';
import { ALBUM_CARD_SQL, db, type AlbumCard } from '@/lib/db';
import { AlbumGrid } from '@/components/AlbumGrid';
import { Cover } from '@/components/Cover';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  const popular = db.prepare(`${ALBUM_CARD_SQL} ORDER BY owners DESC, ratings DESC, a.year DESC LIMIT 12`).all() as AlbumCard[];
  const newest = db.prepare(`${ALBUM_CARD_SQL} ORDER BY a.created_at DESC, a.id DESC LIMIT 6`).all() as AlbumCard[];
  const genres = db
    .prepare('SELECT g.name, g.slug, COUNT(ag.album_id) n FROM genres g LEFT JOIN album_genres ag ON ag.genre_id = g.id GROUP BY g.id ORDER BY n DESC')
    .all() as { name: string; slug: string; n: number }[];
  const stats = db
    .prepare(`SELECT (SELECT COUNT(*) FROM albums) albums, (SELECT COUNT(*) FROM releases) releases,
              (SELECT COUNT(*) FROM artists) artists, (SELECT COUNT(*) FROM users) users`)
    .get() as Record<string, number>;

  return (
    <>
      <section className="hero">
        <div>
          <h1>Twoja kolekcja winyli w jednym miejscu</h1>
          <p>
            Przeglądaj bazę płyt z podziałem na gatunki i wydania, oznaczaj, co już stoi na półce, a co chcesz
            upolować, oceniaj i dziel się opiniami.
          </p>
          <div className="stats">
            <div><b>{stats.albums}</b><span className="muted small">płyt</span></div>
            <div><b>{stats.releases}</b><span className="muted small">wydań</span></div>
            <div><b>{stats.artists}</b><span className="muted small">wykonawców</span></div>
            <div><b>{stats.users}</b><span className="muted small">kolekcjonerów</span></div>
          </div>
          {user ? (
            <Link href="/polka" className="btn">Przejdź do mojej półki</Link>
          ) : (
            <Link href="/rejestracja" className="btn">Załóż konto i zacznij kolekcję</Link>
          )}{' '}
          <Link href="/plyty" className="btn btn-ghost">Przeglądaj katalog</Link>
        </div>
        <div className="hero-stack" aria-hidden>
          {popular.slice(0, 9).map((a) => (
            <Cover key={a.id} title={a.title} artist={a.artist} url={a.cover_url} size="sm" />
          ))}
        </div>
      </section>

      <div className="section-head">
        <h2>Gatunki</h2>
        <Link href="/gatunki" className="small">Wszystkie →</Link>
      </div>
      <div className="chips">
        {genres.map((g) => (
          <Link key={g.slug} href={`/plyty?g=${g.slug}`} className="chip">
            {g.name} <span className="muted">{g.n}</span>
          </Link>
        ))}
      </div>

      <div className="section-head">
        <h2>Najpopularniejsze w kolekcjach</h2>
        <Link href="/plyty?sort=popularne" className="small">Więcej →</Link>
      </div>
      <AlbumGrid albums={popular} />

      <div className="section-head">
        <h2>Ostatnio dodane</h2>
        <Link href="/plyty?sort=nowe" className="small">Więcej →</Link>
      </div>
      <AlbumGrid albums={newest} />
    </>
  );
}
