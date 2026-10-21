import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, STATUS_LABEL, type Status } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { Cover } from '@/components/Cover';
import { ActionForm } from '@/components/ActionForm';
import { addRelease, saveShelf, setCover, toggleRelease } from '@/app/actions';

type Album = {
  id: number; title: string; slug: string; year: number | null; description: string | null; cover_url: string | null;
  artist: string; artist_slug: string; country: string | null;
};
type Release = {
  id: number; label: string | null; catalog_no: string | null; country: string | null; year: number | null;
  format: string | null; vinyl_color: string | null; notes: string | null; cover_url: string | null; owners: number;
};

function getAlbum(slug: string) {
  return db
    .prepare(`SELECT a.*, ar.name artist, ar.slug artist_slug, ar.country FROM albums a JOIN artists ar ON ar.id = a.artist_id WHERE a.slug = ?`)
    .get(slug) as Album | undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = getAlbum((await params).slug);
  return { title: a ? `${a.artist} – ${a.title}` : 'Nie znaleziono' };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const album = getAlbum((await params).slug);
  if (!album) notFound();
  const user = await currentUser();

  const genres = db
    .prepare('SELECT g.name, g.slug FROM album_genres ag JOIN genres g ON g.id = ag.genre_id WHERE ag.album_id = ? ORDER BY g.name')
    .all(album.id) as { name: string; slug: string }[];
  const tracks = db.prepare('SELECT position, title FROM tracks WHERE album_id = ? ORDER BY sort').all(album.id) as {
    position: string | null; title: string;
  }[];
  const releases = db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM user_releases ur WHERE ur.release_id = r.id AND ur.status = 'mam') owners
       FROM releases r WHERE r.album_id = ? ORDER BY r.year IS NULL, r.year, r.id`,
    )
    .all(album.id) as Release[];
  const stats = db
    .prepare(
      `SELECT ROUND(AVG(rating), 1) avg, COUNT(rating) ratings,
              SUM(status = 'mam') mam, SUM(status = 'chce') chce, SUM(status = 'sluchalem') sluchalem
       FROM shelf WHERE album_id = ?`,
    )
    .get(album.id) as { avg: number | null; ratings: number; mam: number | null; chce: number | null; sluchalem: number | null };
  const reviews = db
    .prepare(
      `SELECT u.username, s.rating, s.review, s.status, s.updated_at FROM shelf s JOIN users u ON u.id = s.user_id
       WHERE s.album_id = ? AND s.review IS NOT NULL ORDER BY s.updated_at DESC`,
    )
    .all(album.id) as { username: string; rating: number | null; review: string; status: Status | null; updated_at: string }[];

  const mine = user
    ? (db.prepare('SELECT status, rating, review FROM shelf WHERE user_id = ? AND album_id = ?').get(user.id, album.id) as
        | { status: Status | null; rating: number | null; review: string | null }
        | undefined)
    : undefined;
  const myReleases = new Map(
    user
      ? (db
          .prepare('SELECT ur.release_id, ur.status FROM user_releases ur JOIN releases r ON r.id = ur.release_id WHERE ur.user_id = ? AND r.album_id = ?')
          .all(user.id, album.id) as { release_id: number; status: string }[]).map((r) => [r.release_id, r.status])
      : [],
  );
  const loginHref = `/logowanie?next=/plyta/${album.slug}`;

  return (
    <>
      <div className="album">
        <div className="album-side">
          <Cover title={album.title} artist={album.artist} url={album.cover_url} size="lg" />
          {user && (
            <details style={{ marginTop: 10 }} className="small">
              <summary>{album.cover_url ? 'Zmień okładkę' : 'Dodaj okładkę'}</summary>
              <form action={setCover} style={{ display: 'flex', gap: 8 }}>
                <input type="hidden" name="album_id" value={album.id} />
                <input name="cover_url" type="url" placeholder="https://…/okladka.jpg" defaultValue={album.cover_url ?? ''} />
                <button className="btn btn-small">Zapisz</button>
              </form>
            </details>
          )}

          <div className="panel">
            <h3>Na mojej półce</h3>
            {user ? (
              <form action={saveShelf}>
                <input type="hidden" name="album_id" value={album.id} />
                <div className="status-row">
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                    <label key={s}>
                      <input type="radio" name="status" value={s} defaultChecked={mine?.status === s} />
                      <span>{STATUS_LABEL[s]}</span>
                    </label>
                  ))}
                  <label>
                    <input type="radio" name="status" value="" defaultChecked={!mine?.status} />
                    <span>Brak</span>
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="rating">Moja ocena</label>
                  <select id="rating" name="rating" defaultValue={mine?.rating ?? ''}>
                    <option value="">— bez oceny —</option>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{'★'.repeat(Math.ceil(n / 2))} {n}/10</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="review">Opinia (widoczna dla innych)</label>
                  <textarea id="review" name="review" defaultValue={mine?.review ?? ''} placeholder="Jak brzmi, które wydanie polecasz…" />
                </div>
                <button className="btn">Zapisz</button>
              </form>
            ) : (
              <p className="small">
                <Link href={loginHref} style={{ color: 'var(--accent)' }}>Zaloguj się</Link>, aby oznaczyć płytę jako
                posiadaną, dodać ją do listy zakupów i ocenić.
              </p>
            )}
          </div>
        </div>

        <div>
          <h1>{album.title}</h1>
          <div className="album-artist">
            <Link href={`/artysta/${album.artist_slug}`}>{album.artist}</Link>
            {album.year && <> · {album.year}</>}
          </div>
          <div className="big-rating">
            {stats.avg != null ? (
              <><b>{stats.avg.toFixed(1)}</b><span className="muted">/ 10 · {stats.ratings} {stats.ratings === 1 ? 'ocena' : 'ocen'}</span></>
            ) : (
              <span className="muted">Brak ocen</span>
            )}
          </div>
          <div className="chips">
            {genres.map((g) => <Link key={g.slug} href={`/plyty?g=${g.slug}`} className="chip">{g.name}</Link>)}
          </div>
          <dl className="facts">
            <dt>Mają</dt><dd>{stats.mam ?? 0} os.</dd>
            <dt>Chcą kupić</dt><dd>{stats.chce ?? 0} os.</dd>
            <dt>Słuchali</dt><dd>{stats.sluchalem ?? 0} os.</dd>
            <dt>Wydań w bazie</dt><dd>{releases.length}</dd>
          </dl>
          {album.description && <p>{album.description}</p>}

          {tracks.length > 0 && (
            <>
              <h2>Lista utworów</h2>
              <ol className="tracklist">
                {tracks.map((t, i) => (
                  <li key={i}><span className="pos">{t.position}</span>{t.title}</li>
                ))}
              </ol>
            </>
          )}

          <h2 id="wydania">Wydania</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Rok</th><th>Wytwórnia</th><th>Nr kat.</th><th>Kraj</th><th>Format</th><th>Winyl</th><th></th></tr>
              </thead>
              <tbody>
                {releases.map((r) => {
                  const st = myReleases.get(r.id);
                  return (
                    <tr key={r.id}>
                      <td>{r.year ?? '—'}</td>
                      <td>
                        {r.label ?? '—'}
                        {r.notes && <div className="muted small">{r.notes}</div>}
                      </td>
                      <td className="catno">{r.catalog_no ?? '—'}</td>
                      <td>{r.country ?? '—'}</td>
                      <td>{r.format ?? '—'}</td>
                      <td>{r.vinyl_color ?? '—'}</td>
                      <td className="actions">
                        {user ? (
                          <>
                            <form action={toggleRelease}>
                              <input type="hidden" name="release_id" value={r.id} />
                              <button name="status" value="mam" className={`toggle ${st === 'mam' ? 'on-mam' : ''}`}
                                title={st === 'mam' ? 'Kliknij, aby usunąć' : 'Mam to wydanie'}>
                                {st === 'mam' ? '✓ Mam' : 'Mam'}
                              </button>
                              <button name="status" value="chce" className={`toggle ${st === 'chce' ? 'on-chce' : ''}`}
                                title={st === 'chce' ? 'Kliknij, aby usunąć' : 'Chcę kupić to wydanie'}>
                                {st === 'chce' ? '✓ Chcę' : 'Chcę'}
                              </button>
                            </form>
                          </>
                        ) : (
                          r.owners > 0 && <span className="muted small">{r.owners} ma</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {releases.length === 0 && (
                  <tr><td colSpan={7} className="muted">Brak wydań. Dodaj pierwsze poniżej.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {user ? (
            <details className="panel">
              <summary>+ Dodaj wydanie</summary>
              <ActionForm action={addRelease} submit="Dodaj wydanie">
                <input type="hidden" name="album_id" value={album.id} />
                <div className="row">
                  <div className="field"><label>Wytwórnia</label><input name="label" placeholder="np. Polskie Nagrania Muza" /></div>
                  <div className="field"><label>Numer katalogowy</label><input name="catalog_no" placeholder="np. XL 0298" /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Rok</label><input name="year" type="number" min="1948" max="2100" /></div>
                  <div className="field"><label>Kraj</label><input name="country" placeholder="np. Polska" /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Format</label><input name="format" placeholder="np. LP, 180 g, gatefold" /></div>
                  <div className="field"><label>Kolor winylu</label><input name="vinyl_color" placeholder="np. czarny, przezroczysty" /></div>
                </div>
                <div className="field"><label>Uwagi</label><input name="notes" placeholder="np. limitowane do 500 szt., z plakatem" /></div>
                <div className="field"><label>Okładka wydania (URL, opcjonalnie)</label><input name="cover_url" type="url" /></div>
              </ActionForm>
            </details>
          ) : (
            <p className="small muted" style={{ marginTop: 12 }}>
              Brakuje wydania? <Link href={loginHref} style={{ color: 'var(--accent)' }}>Zaloguj się</Link>, aby je dodać.
            </p>
          )}

          <h2>Opinie</h2>
          {reviews.length === 0 && <p className="muted">Nikt jeszcze nie napisał opinii.</p>}
          {reviews.map((r) => (
            <div key={r.username} className="review">
              <div className="review-head">
                <Link href={`/u/${r.username}`}><strong>{r.username}</strong></Link>
                {r.rating && <span className="rating">★ {r.rating}/10</span>}
                {r.status && <span className={`tag tag-${r.status}`}>{STATUS_LABEL[r.status]}</span>}
                <span className="muted small">{r.updated_at.slice(0, 10)}</span>
              </div>
              <p>{r.review}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
