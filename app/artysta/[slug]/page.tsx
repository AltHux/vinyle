import { notFound } from 'next/navigation';
import { ALBUM_CARD_SQL, db, type AlbumCard } from '@/lib/db';
import { AlbumGrid } from '@/components/AlbumGrid';

type Artist = { id: number; name: string; country: string | null };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = db.prepare('SELECT name FROM artists WHERE slug = ?').get((await params).slug) as { name: string } | undefined;
  return { title: a?.name ?? 'Nie znaleziono' };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const artist = db.prepare('SELECT id, name, country FROM artists WHERE slug = ?').get((await params).slug) as Artist | undefined;
  if (!artist) notFound();
  const albums = db.prepare(`${ALBUM_CARD_SQL} WHERE a.artist_id = ? ORDER BY a.year`).all(artist.id) as AlbumCard[];
  return (
    <>
      <h1>{artist.name}</h1>
      <p className="muted">{[artist.country, `${albums.length} ${albums.length === 1 ? 'płyta' : 'płyt'} w bazie`].filter(Boolean).join(' · ')}</p>
      <h2>Dyskografia</h2>
      <AlbumGrid albums={albums} />
    </>
  );
}
