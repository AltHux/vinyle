import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH } from './db';

/** Avatary leżą na tym samym trwałym dysku co baza (na Render /data/avatars). */
export const AVATAR_DIR = process.env.AVATAR_DIR ?? path.join(path.dirname(DB_PATH), 'avatars');
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_FILE_RE = /^\d+-[a-f0-9]{16}\.(jpg|png|webp|gif)$/;

export const AVATAR_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Rozpoznaje format po pierwszych bajtach pliku, nie po nazwie ani typie podanym przez przeglądarkę. */
function detect(buf: Buffer): keyof typeof AVATAR_TYPES | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a') return 'gif';
  return null;
}

export async function saveAvatar(userId: number, file: File): Promise<{ file: string } | { error: string }> {
  if (!file || file.size === 0) return { error: 'Wybierz plik ze zdjęciem.' };
  if (file.size > AVATAR_MAX_BYTES) return { error: 'Zdjęcie może mieć najwyżej 2 MB.' };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detect(buf);
  if (!ext) return { error: 'Obsługiwane formaty: JPG, PNG, WebP i GIF.' };
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  const name = `${userId}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(AVATAR_DIR, name), buf);
  return { file: name };
}

export function deleteAvatar(name: string | null) {
  if (!name || !AVATAR_FILE_RE.test(name)) return;
  fs.rmSync(path.join(AVATAR_DIR, name), { force: true });
}
