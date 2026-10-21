import Link from 'next/link';
import type { AlbumCard } from '@/lib/db';
import { Cover } from './Cover';

export function AlbumGrid({ albums, badge }: { albums: AlbumCard[]; badge?: (a: AlbumCard) => React.ReactNode }) {
  if (albums.length === 0) return <p className="muted">Brak płyt.</p>;
  return (
    <ul className="grid">
      {albums.map((a) => (
        <li key={a.id} className="card">
          <Link href={`/plyta/${a.slug}`} className="card-link">
            <div className="sleeve">
              <Cover title={a.title} artist={a.artist} url={a.cover_url} />
              <span className="disc" aria-hidden />
            </div>
            <strong className="card-title">{a.title}</strong>
          </Link>
          <Link href={`/artysta/${a.artist_slug}`} className="card-artist">{a.artist}</Link>
          <div className="card-meta">
            {a.year && <span>{a.year}</span>}
            {a.avg_rating != null && <span className="rating">★ {a.avg_rating.toFixed(1)}</span>}
            {badge?.(a)}
          </div>
        </li>
      ))}
    </ul>
  );
}
