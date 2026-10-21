import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { register } from '@/app/actions';

export const metadata = { title: 'Załóż konto' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/polka' } = await searchParams;
  return (
    <div className="auth panel">
      <h1>Załóż konto</h1>
      
      <ActionForm action={register} submit="Załóż konto">
        <input type="hidden" name="next" value={next} />
        <div className="field"><label htmlFor="username">Nazwa użytkownika</label><input id="username" name="username" autoComplete="username" required /></div>
        <div className="field"><label htmlFor="password">Hasło</label><input id="password" name="password" type="password" autoComplete="new-password" required /></div>
      </ActionForm>
      <p className="small">Masz już konto? <Link href={`/logowanie?next=${encodeURIComponent(next)}`} style={{ color: "var(--accent)" }}>Zaloguj się</Link>.</p>
    </div>
  );
}
