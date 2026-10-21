import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export default async function MyShelf() {
  const user = await requireUser('/polka');
  redirect(`/u/${encodeURIComponent(user.username)}`);
}
