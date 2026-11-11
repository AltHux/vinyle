import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/RegisterForm';
import { MIN_AGE } from '@/lib/account';
import { currentUser } from '@/lib/auth';

export const metadata = { title: 'Załóż konto' };

export default async function Page() {
  if (await currentUser()) redirect('/profil');
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - MIN_AGE);
  return (
    <div className="auth panel">
      <h1>Załóż konto</h1>
      <p className="muted small">Po rejestracji wyślemy Ci mail z linkiem do potwierdzenia adresu.</p>
      <RegisterForm minAge={MIN_AGE} maxBirth={d.toISOString().slice(0, 10)} />
      <p className="small">Masz już konto? <Link href="/logowanie" style={{ color: 'var(--accent)' }}>Zaloguj się</Link>.</p>
    </div>
  );
}
