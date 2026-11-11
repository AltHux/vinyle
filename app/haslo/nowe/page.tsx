import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { resetPassword } from '@/app/actions';
import { findToken } from '@/lib/account';

export const metadata = { title: 'Nowe hasło' };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  if (!token || !findToken(token, 'reset')) {
    return (
      <div className="auth panel">
        <h1>Link nie działa</h1>
        <p>Link do zmiany hasła wygasł (jest ważny godzinę) albo był już użyty.</p>
        <Link href="/haslo" className="btn">Poproś o nowy</Link>
      </div>
    );
  }
  return (
    <div className="auth panel">
      <h1>Ustaw nowe hasło</h1>
      <ActionForm action={resetPassword} submit="Zapisz hasło">
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="password">Nowe hasło (min. 8 znaków)</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="field">
          <label htmlFor="password2">Powtórz hasło</label>
          <input id="password2" name="password2" type="password" autoComplete="new-password" required minLength={8} />
        </div>
      </ActionForm>
    </div>
  );
}
