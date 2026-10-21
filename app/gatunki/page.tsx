import Link from 'next/link';
import { db } from '@/lib/db';
import { Cover } from '@/components/Cover';

export const metadata = { title: 'Gatunki' };

export default function Genres() {
  const genres = db
    .prepare('SELECT g.id, g.name, g.slug, COUNT(ag.album_id) n FROM genres g LEFT JOIN album_genres ag ON ag.genre_id = g.id GROUP BY g.id ORDER BY g.name')
    .all() as { id: number; name: string; slug: string; n: number }[];
  const covers = db.prepare(
    `SELECT a.title, a.cover_url, ar.name artist FROM album_genres ag JOIN albums a ON a.id = ag.album_id
     JOIN artists ar ON ar.id = a.artist_id WHERE ag.genre_id = ? ORDER BY a.year LIMIT 4`,
  );
  return (
    <>
      <h1>Gatunki</h1>
      <ul className="genre-grid">
        {genres.map((g) => (
          <li key={g.slug}>
            <Link href={`/plyty?g=${g.slug}`} className="genre-card">
              <div className="genre-covers">
                {(covers.all(g.id) as { title: string; cover_url: string | null; artist: string }[]).map((c) => (
                  <Cover key={c.title} title={c.title} artist={c.artist} url={c.cover_url} size="sm" />
                ))}
              </div>
              <div>
                <strong>{g.name}</strong>
                <span className="muted small">{g.n} płyt</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
