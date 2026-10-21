import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ActionForm } from '@/components/ActionForm';
import { addAlbum } from '@/app/actions';

export const metadata = { title: 'Dodaj płytę' };

export default async function AddAlbum() {
  await requireUser('/dodaj');
  const genres = db.prepare('SELECT id, name FROM genres ORDER BY name').all() as { id: number; name: string }[];
  const artists = db.prepare('SELECT name FROM artists ORDER BY name').all() as { name: string }[];
  return (
    <div className="form-page">
      <h1>Dodaj płytę do bazy</h1>
      <p className="muted">Dodajesz album. Konkretne wydania (pressingi) dopiszesz na jego stronie.</p>
      <ActionForm action={addAlbum} submit="Dodaj płytę">
        <div className="row">
          <div className="field">
            <label htmlFor="artist">Wykonawca *</label>
            <input id="artist" name="artist" list="artists" required />
            <datalist id="artists">{artists.map((a) => <option key={a.name} value={a.name} />)}</datalist>
          </div>
          <div className="field"><label htmlFor="title">Tytuł *</label><input id="title" name="title" required /></div>
        </div>
        <div className="row">
          <div className="field"><label htmlFor="year">Rok pierwszego wydania</label><input id="year" name="year" type="number" min="1900" max="2100" /></div>
          <div className="field"><label htmlFor="country">Kraj wykonawcy (jeśli nowy)</label><input id="country" name="country" /></div>
        </div>
        <div className="field">
          <span className="label">Gatunki *</span>
          <div className="checks">
            {genres.map((g) => (
              <label key={g.id}><input type="checkbox" name="genres" value={g.id} /> {g.name}</label>
            ))}
          </div>
        </div>
        <div className="field"><label htmlFor="cover_url">Okładka (adres obrazka)</label><input id="cover_url" name="cover_url" type="url" placeholder="https://…" /></div>
        <div className="field"><label htmlFor="description">Opis</label><textarea id="description" name="description" /></div>
        <div className="field">
          <label htmlFor="tracks">Lista utworów (jeden na linię, np. „A1 Tytuł”)</label>
          <textarea id="tracks" name="tracks" rows={6} placeholder={'A1 Pierwszy utwór\nA2 Drugi utwór\nB1 …'} />
        </div>
      </ActionForm>
    </div>
  );
}
