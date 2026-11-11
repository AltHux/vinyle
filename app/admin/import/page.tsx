import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { currentUser, isAdmin } from '@/lib/auth';
import { DISCOGS_GENRES } from '@/lib/discogs';
import { ActionForm } from '@/components/ActionForm';
import { AutoRefresh } from '@/components/AutoRefresh';
import { startDiscogsImport, stopDiscogsImport } from '@/app/actions';

export const metadata = { title: 'Import z Discogs' };

type Job = {
  id: number; params: string; status: string; total: number; imported: number; skipped: number;
  log: string; created_at: string; finished_at: string | null;
};
const STATUS: Record<string, string> = { running: 'trwa', done: 'zakończony', failed: 'błąd', stopped: 'zatrzymany' };

function describe(p: { mode: string; genre?: string; style?: string; country?: string; yearFrom?: number; yearTo?: number; limit?: number; ids?: number[] }) {
  if (p.mode === 'ids') return `${p.ids?.length} wskazanych płyt`;
  const years = p.yearFrom || p.yearTo ? `${p.yearFrom ?? '…'}–${p.yearTo ?? '…'}` : null;
  return [p.genre, p.style, p.country, years].filter(Boolean).join(' · ') + ` · do ${p.limit} nowych`;
}

export default async function ImportPage() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  const jobs = db.prepare('SELECT * FROM import_jobs ORDER BY id DESC LIMIT 10').all() as Job[];
  const running = jobs.some((j) => j.status === 'running');
  const hasToken = Boolean(process.env.DISCOGS_TOKEN);
  const counts = db
    .prepare('SELECT (SELECT COUNT(*) FROM albums) albums, (SELECT COUNT(*) FROM albums WHERE discogs_master_id IS NOT NULL) discogs, (SELECT COUNT(*) FROM releases) releases')
    .get() as { albums: number; discogs: number; releases: number };

  return (
    <div className="form-page" style={{ maxWidth: 820 }}>
      {running && <AutoRefresh />}
      <h1>Import z Discogs</h1>
      <p className="muted">
        W bazie: {counts.albums} płyt (z Discogs: {counts.discogs}), {counts.releases} wydań. Discogs pozwala na ok. 60 zapytań na
        minutę, a jedna płyta to 2 zapytania, więc 100 płyt importuje się ok. 4 minut. Import działa na serwerze i możesz zamknąć tę stronę.
      </p>
      {!hasToken && (
        <p className="error">Brak tokena: dodaj zmienną <b>DISCOGS_TOKEN</b> w ustawieniach serwisu na Render (Environment).</p>
      )}

      <div className="panel">
        <h3>Według gatunku, stylu lub kraju</h3>
        <p className="small muted" style={{ marginTop: 0 }}>Bierze najpopularniejsze albumy (najczęściej posiadane na Discogs), które jeszcze nie są w bazie.</p>
        <ActionForm action={startDiscogsImport} submit="Importuj">
          <input type="hidden" name="mode" value="search" />
          <div className="row">
            <div className="field">
              <label htmlFor="genre">Gatunek</label>
              <select id="genre" name="genre" defaultValue="">
                <option value="">— dowolny —</option>
                {DISCOGS_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="style">Styl (po angielsku)</label><input id="style" name="style" placeholder="np. Hard Bop, Post-Punk" /></div>
            <div className="field"><label htmlFor="country">Kraj wydania (po angielsku)</label><input id="country" name="country" placeholder="np. Poland" /></div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="year_from">Rok od</label><input id="year_from" name="year_from" type="number" min="1900" max="2100" /></div>
            <div className="field"><label htmlFor="year_to">Rok do</label><input id="year_to" name="year_to" type="number" min="1900" max="2100" /></div>
            <div className="field"><label htmlFor="limit">Ile nowych płyt</label><input id="limit" name="limit" type="number" min="1" max="500" defaultValue={50} /></div>
          </div>
        </ActionForm>
      </div>

      <div className="panel">
        <h3>Konkretne płyty</h3>
        <ActionForm action={startDiscogsImport} submit="Importuj wskazane">
          <input type="hidden" name="mode" value="ids" />
          <div className="field">
            <label htmlFor="ids">Linki do masterów z Discogs, jeden na linię</label>
            <textarea id="ids" name="ids" rows={5} placeholder={'https://www.discogs.com/master/5460-Miles-Davis-Kind-Of-Blue\nhttps://www.discogs.com/master/...'} />
          </div>
        </ActionForm>
      </div>

      <h2>Ostatnie importy</h2>
      {jobs.length === 0 && <p className="muted">Jeszcze nic nie importowano.</p>}
      {jobs.map((j) => (
        <details key={j.id} className="panel" open={j.status === 'running' || j.id === jobs[0].id}>
          <summary>
            {describe(JSON.parse(j.params))} · <b>{STATUS[j.status]}</b> · nowe: {j.imported}, uzupełnione/pominięte: {j.skipped}
          </summary>
          {j.status === 'running' && (
            <form action={stopDiscogsImport} style={{ marginBottom: 10 }}>
              <input type="hidden" name="job_id" value={j.id} />
              <button className="btn btn-small btn-ghost">Zatrzymaj</button>
            </form>
          )}
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem', maxHeight: 320, overflow: 'auto', margin: 0 }}>
            {j.log.trim().split('\n').reverse().join('\n') || 'Czekam na pierwsze wyniki…'}
          </pre>
          <p className="small muted">Start: {j.created_at}{j.finished_at && ` · koniec: ${j.finished_at}`} (UTC)</p>
        </details>
      ))}
    </div>
  );
}
