'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Odświeża dane strony co kilka sekund, dopóki trwa import. */
export function AutoRefresh({ ms = 4000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
