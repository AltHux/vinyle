import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { resendVerification } from '@/app/actions';

export const metadata = { title: 'Potwierdź adres e-mail' };

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string; niepotwierdzony?: string }> }) {
  const { email = '', niepotwierdzony } = await searchParams;
  return (
    <div className="auth panel">
      <h1>Sprawdź pocztę</h1>
      {niepotwierdzony ? (
        <p>Zanim się zalogujesz, potwierdź adres e-mail. Link wysłaliśmy przy rejestracji{email && <> na <b>{email}</b></>}.</p>
      ) : (
        <p>Wysłaliśmy link potwierdzający{email && <> na <b>{email}</b></>}. Kliknij go, a potem zaloguj się.</p>
      )}
      <p className="muted small">Mail nie dotarł? Zajrzyj do folderu spam albo wyślij go jeszcze raz.</p>
      <ActionForm action={resendVerification} submit="Wyślij link ponownie">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required defaultValue={email} />
        </div>
      </ActionForm>
      <p className="small"><Link href="/logowanie" style={{ color: 'var(--accent)' }}>Przejdź do logowania</Link></p>
    </div>
  );
}
