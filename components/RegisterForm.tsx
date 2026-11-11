'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { register } from '@/app/actions';

/** Formularz rejestracji; po błędzie zachowuje wpisane dane (poza hasłami). */
export function RegisterForm({ minAge, maxBirth }: { minAge: number; maxBirth: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  const v = state?.values;
  return (
    <form action={action} key={JSON.stringify(v ?? {})}>
      <div className="field">
        <label htmlFor="username">Nazwa użytkownika</label>
        <input id="username" name="username" autoComplete="username" required minLength={3} maxLength={30} defaultValue={v?.username} />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={v?.email} />
      </div>
      <div className="field">
        <label htmlFor="birth_date">Data urodzenia</label>
        <input id="birth_date" name="birth_date" type="date" required min="1900-01-01" max={maxBirth} defaultValue={v?.birth_date} />
        <span className="hint">Konto można założyć od {minAge}. roku życia. Data nie jest pokazywana innym.</span>
      </div>
      <div className="field">
        <label htmlFor="password">Hasło (min. 8 znaków)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="field">
        <label htmlFor="password2">Powtórz hasło</label>
        <input id="password2" name="password2" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <label className="check">
        <input type="checkbox" name="terms" required />
        <span>
          Mam co najmniej {minAge} lat i akceptuję <Link href="/zasady" target="_blank">zasady serwisu</Link>.
        </span>
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Zakładanie konta…' : 'Załóż konto'}</button>
    </form>
  );
}
