import type { Metadata } from 'next';
import Link from 'next/link';
import { currentUser, isAdmin } from '@/lib/auth';
import { Avatar } from '@/components/Avatar';
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
                  {isAdmin(user) && <Link href="/admin/import">Import</Link>}
                  <Link href="/dodaj" className="btn btn-small">+ Dodaj płytę</Link>
                  <Link href="/profil" className="who" title="Mój profil">
                    <Avatar username={user.username} avatar={user.avatar} size={30} />
                  </Link>
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
        <footer className="wrap footer">
          Vinyle · baza płyt winylowych tworzona przez kolekcjonerów. Część danych i okładek pochodzi z{' '}
          <a href="https://www.discogs.com" target="_blank" rel="noreferrer">Discogs</a>. Vinyle używa Discogs API, ale nie jest
          powiązane z Discogs ani przez nie wspierane.
        </footer>
      </body>
    </html>
  );
}
