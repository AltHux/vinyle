import type { Metadata } from 'next';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { logout } from './actions';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Vinyle – baza płyt winylowych', template: '%s · Vinyle' },
  description: 'Katalog płyt winylowych, wydań i okładek. Oznaczaj, co masz i co chcesz kupić.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="pl">
      <body>
        <header className="topbar">
          <div className="wrap topbar-inner">
            <Link href="/" className="logo">
              <span className="logo-disc" aria-hidden /> Vinyle
            </Link>
            <form action="/plyty" className="search">
              <input name="q" type="search" placeholder="Szukaj płyty lub wykonawcy…" aria-label="Szukaj" />
            </form>
            <nav className="nav">
              <Link href="/plyty">Katalog</Link>
              <Link href="/gatunki">Gatunki</Link>
              {user ? (
                <>
                  <Link href="/polka">Moja półka</Link>
                  <Link href="/dodaj" className="btn btn-small">+ Dodaj płytę</Link>
                  <form action={logout}>
                    <button className="linkish" title={`Zalogowany jako ${user.username}`}>Wyloguj</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/logowanie">Zaloguj</Link>
                  <Link href="/rejestracja" className="btn btn-small">Załóż konto</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap footer">Vinyle · baza płyt winylowych tworzona przez kolekcjonerów</footer>
      </body>
    </html>
  );
}
