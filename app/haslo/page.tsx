import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { requestPasswordReset } from '@/app/actions';

export const metadata = { title: 'Nie pamiętam hasła' };

export default function Page() {
  return (
    <div className="auth panel">
      <h1>Nie pamiętasz hasła?</h1>
      <p className="muted small">Podaj adres e-mail konta, a wyślemy link do ustawienia nowego hasła.</p>
      <ActionForm action={requestPasswordReset} submit="Wyślij link">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
      </ActionForm>
      <p className="small"><Link href="/logowanie" style={{ color: 'var(--accent)' }}>Wróć do logowania</Link></p>
    </div>
  );
}
