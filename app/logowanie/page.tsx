import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { login } from '@/app/actions';

export const metadata = { title: 'Zaloguj się' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/polka' } = await searchParams;
  return (
    <div className="auth panel">
      <h1>Zaloguj się</h1>
      <p className="muted small">Konto demo: <b>demo</b> / <b>demo1234</b></p>
      <ActionForm action={login} submit="Zaloguj się">
        <input type="hidden" name="next" value={next} />
        <div className="field"><label htmlFor="username">Nazwa użytkownika lub e-mail</label><input id="username" name="username" autoComplete="username" required /></div>
        <div className="field"><label htmlFor="password">Hasło</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      </ActionForm>
      <p className="small"><Link href="/haslo" style={{ color: 'var(--accent)' }}>Nie pamiętasz hasła?</Link></p>
      <p className="small">Nie masz konta? <Link href="/rejestracja" style={{ color: 'var(--accent)' }}>Załóż je</Link>.</p>
    </div>
  );
}
