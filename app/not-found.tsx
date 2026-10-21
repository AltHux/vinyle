import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <h1>Ta płyta się zarysowała</h1>
      <p className="muted">Nie znaleźliśmy tej strony.</p>
      <Link href="/plyty" className="btn">Wróć do katalogu</Link>
    </div>
  );
}
