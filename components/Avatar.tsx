/* eslint-disable @next/next/no-img-element */

/** Zdjęcie profilowe albo kółko z pierwszą literą nazwy. */
export function Avatar({ username, avatar, size = 40 }: { username: string; avatar?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (avatar) return <img className="avatar" src={`/avatar/${avatar}`} alt={username} width={size} height={size} style={style} />;
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar avatar-gen" style={{ ...style, background: `hsl(${h} 45% 45%)` }} aria-hidden>
      {username.slice(0, 1).toUpperCase()}
    </span>
  );
}
