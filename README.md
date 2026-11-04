# Vinyle

Baza płyt winylowych w stylu lubimyczytac.pl: katalog albumów z gatunkami, wydaniami (pressingami) i okładkami,
a każdy użytkownik prowadzi własną półkę („Mam”, „Chcę kupić”, „Słuchałem”), ocenia płyty w skali 1–10 i pisze opinie.

## Uruchomienie

Wymagany Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Przy pierwszym starcie tworzy się baza `data/vinyle.db` z przykładowymi danymi (32 albumy, ~45 wydań, 11 gatunków)
i kontem demo **demo / demo1234**. `npm run db:reset` usuwa bazę, a kolejny start tworzy ją od nowa.

Produkcyjnie: `npm run build && npm start`.

## Co jest w środku

| Strona | Co robi |
| --- | --- |
| `/` | statystyki, gatunki, najpopularniejsze i ostatnio dodane płyty |
| `/plyty` | katalog z wyszukiwarką, filtrem gatunku i dekady oraz sortowaniem |
| `/gatunki` | lista gatunków z miniaturami okładek |
| `/plyta/[slug]` | album: okładka, średnia ocen, lista utworów, tabela wydań, półka użytkownika, opinie, dodawanie wydań i okładki |
| `/artysta/[slug]` | dyskografia wykonawcy |
| `/u/[nazwa]` | publiczna półka użytkownika z zakładkami Mam / Chcę kupić / Słuchałem / Ocenione |
| `/polka` | skrót do własnej półki |
| `/dodaj` | dodanie nowego albumu (wykonawca, gatunki, okładka, utwory) |
| `/logowanie`, `/rejestracja` | konta (hasła hashowane scryptem, sesja w ciasteczku httpOnly) |

Model danych (`lib/db.ts`):

- `albums` – album („master”), należy do `artists`, ma wiele `genres` (przez `album_genres`) i `tracks`
- `releases` – konkretne wydania albumu: wytwórnia, nr katalogowy, kraj, rok, format, kolor winylu, uwagi, własna okładka
- `shelf` – półka użytkownika na poziomie albumu: status, ocena, opinia
- `user_releases` – które konkretne wydania użytkownik ma lub chce kupić (oznaczenie wydania jako „Mam” ustawia też album jako posiadany)

Stack: Next.js 15 (App Router, Server Components, Server Actions), React 19, SQLite przez better-sqlite3. Bez zewnętrznych usług.

Okładki: można wkleić adres obrazka przy albumie lub wydaniu. Płyty bez okładki dostają generowaną okładkę w kolorach wyliczanych z tytułu.

## Plan dalszych kroków

1. **Import z Discogs** – skrypt pobierający mastery i wydania (z okładkami) przez Discogs API po gatunku lub liście ID. Wymaga darmowego tokena Discogs; alternatywnie MusicBrainz + Cover Art Archive bez klucza.
2. **Upload okładek** zamiast samych adresów URL (dysk lub S3/R2).
3. **Moderacja** – historia zmian, zgłaszanie błędów, rola administratora do łączenia duplikatów.
4. **Społeczność** – obserwowanie znajomych, aktywność, listy tematyczne („Najlepszy polski jazz”), wyzwania roczne.
5. **Kolekcja** – stan płyty i okładki (Mint, VG+…), cena zakupu, wartość kolekcji, eksport do CSV.
6. **Wdrożenie** – np. VPS/Fly.io z trwałym wolumenem na SQLite albo migracja na Postgres (Prisma/Drizzle) przy większym ruchu.

Dane przykładowe służą do demonstracji; numery katalogowe są wpisane tylko tam, gdzie były pewne.

## Wdrożenie

Aplikacja buduje się do obrazu Dockera (`Dockerfile`, tryb `standalone`). Baza SQLite leży w `/data/vinyle.db`,
więc hosting musi zapewnić trwały dysk zamontowany w `/data`.

- **Fly.io** (`fly.toml`): `fly launch --copy-config --no-deploy`, `fly volumes create vinyle_data --size 1 --region waw`, `fly deploy`.
- **Render** (`render.yaml`): New → Blueprint i wskazanie repozytorium. Trwały dysk wymaga płatnego planu Starter.
