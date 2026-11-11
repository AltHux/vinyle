import fs from 'node:fs/promises';
import path from 'node:path';
import { AVATAR_DIR, AVATAR_FILE_RE, AVATAR_TYPES } from '@/lib/avatars';

/** Serwuje avatary z dysku. Nazwa pliku zmienia się przy każdej podmianie, więc można je długo cache'ować. */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!AVATAR_FILE_RE.test(file)) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(path.join(AVATAR_DIR, file));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': AVATAR_TYPES[file.split('.').pop()!],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
