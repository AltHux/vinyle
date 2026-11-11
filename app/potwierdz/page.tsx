import Link from 'next/link';
import { confirmEmail } from '@/lib/account';
import { currentUser } from '@/lib/auth';

export const metadata = { title: 'Potwierdzenie adresu' };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const result = token ? confirmEmail(token) : 'invalid';
  const user = await currentUser();
  return (
    <div className="auth panel">
      {result === 'ok' ? (
        <>
          <h1>Adres potwierdzony</h1>
          <p>Dzięki! Twój adres e-mail jest potwierdzony.</p>
          {user ? (
            <Link href="/profil" className="btn">Przejdź do profilu</Link>
          ) : (
            <Link href="/logowanie?next=/profil" className="btn">Zaloguj się</Link>
          )}
        </>
      ) : (
        <>
          <h1>Link nie działa</h1>
          <p>
            {result === 'taken'
              ? 'Ten adres został w międzyczasie przypisany do innego konta.'
              : 'Link wygasł albo jest niepełny. Wyślij nowy i kliknij najnowszy mail.'}
          </p>
          <Link href="/rejestracja/poczta" className="btn">Wyślij nowy link</Link>
        </>
      )}
    </div>
  );
}
