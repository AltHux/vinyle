import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALBUM_CARD_SQL, db, STATUS_LABEL, type AlbumCard, type Status } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { AlbumGrid } from '@/components/AlbumGrid';

type Row = AlbumCard & { status: Status | null; my_rating: number | null; pressings: string | null };

const TABS = [
  ['mam', 'Mam'],
  ['chce', 'Chcę kupić'],
  ['sluchalem', 'Słuchałem'],
  ['ocenione', 'Ocenione'],
] as const;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  return { title: `Półka: ${decodeURIComponent((await params).username)}` };
}

export default async function UserShelf({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const username = decodeURIComponent((await params).username);
  const owner = db.prepare('SELECT id, username, created_at FROM users WHERE username = ?').get(username) as
    | { id: number; username: string; created_at: string }
    | undefined;
  if (!owner) notFound();
  const me = await currentUser();
  const isMe = me?.id === owner.id;
  const { p = 'mam' } = await searchParams;
  const tab = TABS.some(([k]) => k === p) ? p : 'mam';

  const rows = db
    .prepare(
      `SELECT c.*, s.status, s.rating my_rating,
              (SELECT GROUP_CONCAT(COALESCE(r.label, '') || COALESCE(' ' || r.catalog_no, '') || COALESCE(' (' || r.year || ')', ''), '; ')
                 FROM user_releases ur JOIN releases r ON r.id = ur.release_id
                WHERE ur.user_id = s.user_id AND r.album_id = s.album_id AND ur.status = s.status) pressings
       FROM shelf s JOIN (${ALBUM_CARD_SQL}) c ON c.id = s.album_id
       WHERE s.user_id = ? ORDER BY s.updated_at DESC`,
    )
    .all(owner.id) as Row[];
  const counts = {
    mam: rows.filter((r) => r.status === 'mam').length,
    chce: rows.filter((r) => r.status === 'chce').length,
    sluchalem: rows.filter((r) => r.status === 'sluchalem').length,
    ocenione: rows.filter((r) => r.my_rating != null).length,
  };
  const shown = tab === 'ocenione'
    ? rows.filter((r) => r.my_rating != null).sort((a, b) => (b.my_rating ?? 0) - (a.my_rating ?? 0))
    : rows.filter((r) => r.status === tab);
  const byId = new Map(shown.map((r) => [r.id, r]));

  return (
    <>
      <h1>{isMe ? 'Moja półka' : `Półka użytkownika ${owner.username}`}</h1>
      <p className="muted">
        {owner.username} · w Vinyle od {owner.created_at.slice(0, 10)}
        {isMe && <> · <Link href={`/u/${owner.username}`} style={{ color: 'var(--accent)' }}>link do udostępnienia</Link></>}
      </p>
      <nav className="tabs">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/u/${owner.username}?p=${k}`} className={tab === k ? 'active' : ''}>
            {label}<span>{counts[k]}</span>
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="muted">
          Pusto. {isMe && <Link href="/plyty" style={{ color: 'var(--accent)' }}>Przeglądaj katalog</Link>}
          {isMe && ' i oznaczaj płyty na ich stronach.'}
        </p>
      ) : (
        <AlbumGrid
          albums={shown}
          badge={(a) => {
            const r = byId.get(a.id)!;
            return (
              <>
                {tab === 'ocenione' && r.status && <span className={`tag tag-${r.status}`}>{STATUS_LABEL[r.status]}</span>}
                {r.my_rating != null && <span title="Ocena użytkownika">♥ {r.my_rating}/10</span>}
                {r.pressings && <span className="small" style={{ flexBasis: '100%' }}>{r.pressings}</span>}
              </>
            );
          }}
        />
      )}
    </>
  );
}
