import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { Avatar } from '@/components/Avatar';
import { changeEmail, changePassword, removeAvatar, updateProfile, uploadAvatar } from '@/app/actions';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata = { title: 'Mój profil' };

export default async function Page({ searchParams }: { searchParams: Promise<{ haslo?: string }> }) {
  const user = await requireUser('/profil');
  const { haslo } = await searchParams;
  const p = db.prepare('SELECT email, email_verified_at, birth_date, bio, created_at FROM users WHERE id = ?').get(user.id) as {
    email: string | null;
    email_verified_at: string | null;
    birth_date: string | null;
    bio: string | null;
    created_at: string;
  };

  return (
    <div className="form-page">
      <h1>Mój profil</h1>
      {haslo && <p className="ok">Hasło zmienione, jesteś zalogowany.</p>}

      <section className="panel profile-head">
        <Avatar username={user.username} avatar={user.avatar} size={96} />
        <div>
          <h2 style={{ margin: 0 }}>{user.username}</h2>
          <p className="muted small" style={{ margin: '4px 0 8px' }}>W Vinyle od {p.created_at.slice(0, 10)}</p>
          <Link href={`/u/${user.username}`} style={{ color: 'var(--accent)' }}>Zobacz publiczny profil i półkę</Link>
        </div>
      </section>

      <section className="panel">
        <h3>Zdjęcie profilowe</h3>
        <ActionForm action={uploadAvatar} submit="Wgraj zdjęcie">
          <div className="field">
            <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
            <span className="hint">JPG, PNG, WebP lub GIF, do 2 MB. Najlepiej kwadratowe.</span>
          </div>
        </ActionForm>
        {user.avatar && (
          <form action={removeAvatar} style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-small">Usuń zdjęcie</button>
          </form>
        )}
      </section>

      <section className="panel">
        <h3>O mnie</h3>
        <ActionForm action={updateProfile} submit="Zapisz">
          <div className="field">
            <textarea name="bio" rows={4} maxLength={500} defaultValue={p.bio ?? ''} placeholder="Co zbierasz, czego słuchasz, czego szukasz…" />
            <span className="hint">Widoczne na Twoim publicznym profilu. Do 500 znaków.</span>
          </div>
        </ActionForm>
      </section>

      <section className="panel">
        <h3>Adres e-mail</h3>
        <p className="small">
          {p.email ? (
            <>Obecny adres: <b>{p.email}</b> {p.email_verified_at ? <span className="tag tag-mam">potwierdzony</span> : <span className="tag tag-chce">niepotwierdzony</span>}</>
          ) : (
            <>Nie masz jeszcze adresu e-mail. Dodaj go, żeby móc odzyskać hasło.</>
          )}
        </p>
        <ActionForm action={changeEmail} submit={p.email ? 'Zmień adres' : 'Dodaj adres'}>
          <div className="field">
            <label htmlFor="email">{p.email ? 'Nowy adres' : 'Adres e-mail'}</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
        </ActionForm>
        {p.birth_date && <p className="muted small">Data urodzenia: {p.birth_date} (niewidoczna dla innych).</p>}
      </section>

      <section className="panel">
        <h3>Hasło</h3>
        <ActionForm action={changePassword} submit="Zmień hasło">
          <div className="field">
            <label htmlFor="current">Obecne hasło</label>
            <input id="current" name="current" type="password" autoComplete="current-password" required />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="password">Nowe hasło</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            <div className="field">
              <label htmlFor="password2">Powtórz nowe hasło</label>
              <input id="password2" name="password2" type="password" autoComplete="new-password" required minLength={8} />
            </div>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
