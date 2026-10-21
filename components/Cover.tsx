/* eslint-disable @next/next/no-img-element */

function hash(s: string) {
  // FNV-1a z końcowym wymieszaniem bitów, żeby kolory rozkładały się równomiernie
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Okładka płyty. Bez adresu obrazka rysuje generowaną okładkę z tytułem. */
export function Cover({ title, artist, url, size = 'md' }: { title: string; artist: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  if (url) {
    return (
      <div className={`cover cover-${size}`}>
        <img src={url} alt={`${artist} – ${title}`} loading="lazy" />
      </div>
    );
  }
  const h = hash(artist + title);
  const hue = h % 360;
  const hue2 = (hue + 40 + ((h >>> 9) % 80)) % 360;
  const pattern = (h >>> 17) % 3;
  return (
    <div
      className={`cover cover-${size} cover-gen cover-p${pattern}`}
      style={{ ['--h1' as string]: hue, ['--h2' as string]: hue2 }}
      role="img"
      aria-label={`${artist} – ${title}`}
    >
      <span className="cover-artist">{artist}</span>
      <span className="cover-title">{title}</span>
    </div>
  );
}
