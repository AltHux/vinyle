import type Database from 'better-sqlite3';
import { hashPassword } from './password';

// Dane przykładowe do startu. Numery katalogowe podane tylko tam, gdzie są pewne;
// docelowo katalog można zasilić importem z Discogs/MusicBrainz.

const GENRES = [
  ['Rock', 'rock'],
  ['Jazz', 'jazz'],
  ['Elektronika', 'elektronika'],
  ['Hip-hop', 'hip-hop'],
  ['Soul i funk', 'soul-funk'],
  ['Pop', 'pop'],
  ['Metal', 'metal'],
  ['Punk i post-punk', 'punk'],
  ['Reggae', 'reggae'],
  ['Muzyka klasyczna', 'klasyczna'],
  ['Muzyka filmowa', 'filmowa'],
] as const;

type R = [label: string, catalog: string | null, country: string, year: number, format: string, color?: string, notes?: string];
type A = {
  artist: string;
  country: string;
  title: string;
  year: number;
  genres: string[];
  desc: string;
  releases: R[];
  tracks?: string[];
};

const ALBUMS: A[] = [
  {
    artist: 'Miles Davis', country: 'USA', title: 'Kind of Blue', year: 1959, genres: ['jazz'],
    desc: 'Modalny kamień milowy jazzu nagrany z Coltrane’em, Adderleyem, Evansem i Kellym. Najlepiej sprzedający się album jazzowy w historii.',
    releases: [
      ['Columbia', 'CL 1355', 'USA', 1959, 'LP, mono', 'czarny', 'Pierwsze wydanie mono, „6-eye” label'],
      ['Columbia', 'CS 8163', 'USA', 1959, 'LP, stereo', 'czarny', 'Pierwsze wydanie stereo'],
      ['Columbia / Legacy', null, 'Europa', 2015, 'LP, 180 g, reedycja', 'czarny'],
    ],
    tracks: ['A1 So What', 'A2 Freddie Freeloader', 'A3 Blue in Green', 'B1 All Blues', 'B2 Flamenco Sketches'],
  },
  {
    artist: 'Pink Floyd', country: 'Wielka Brytania', title: 'The Dark Side of the Moon', year: 1973, genres: ['rock'],
    desc: 'Koncept o presji współczesnego życia, przełom w produkcji studyjnej i jedna z najlepiej sprzedających się płyt wszech czasów.',
    releases: [
      ['Harvest', 'SHVL 804', 'Wielka Brytania', 1973, 'LP, gatefold', 'czarny', 'Z plakatami i naklejkami'],
      ['Harvest', 'SMAS-11163', 'USA', 1973, 'LP, gatefold', 'czarny'],
      ['Pink Floyd Records', null, 'Europa', 2016, 'LP, 180 g, remaster', 'czarny'],
    ],
    tracks: ['A1 Speak to Me', 'A2 Breathe', 'A3 On the Run', 'A4 Time', 'A5 The Great Gig in the Sky', 'B1 Money', 'B2 Us and Them', 'B3 Any Colour You Like', 'B4 Brain Damage', 'B5 Eclipse'],
  },
  {
    artist: 'The Beatles', country: 'Wielka Brytania', title: 'Abbey Road', year: 1969, genres: ['rock', 'pop'],
    desc: 'Ostatni album nagrany wspólnie przez Beatlesów, ze słynną suitą na stronie B.',
    releases: [
      ['Apple', 'PCS 7088', 'Wielka Brytania', 1969, 'LP, stereo', 'czarny'],
      ['Apple', 'SO-383', 'USA', 1969, 'LP, stereo', 'czarny'],
      ['Apple', null, 'Europa', 2019, 'LP, 180 g, mix 50th Anniversary', 'czarny'],
    ],
    tracks: ['A1 Come Together', 'A2 Something', 'A3 Maxwell’s Silver Hammer', 'A4 Oh! Darling', 'A5 Octopus’s Garden', 'A6 I Want You (She’s So Heavy)', 'B1 Here Comes the Sun', 'B2 Because', 'B3 You Never Give Me Your Money', 'B4 Sun King', 'B5 Mean Mr. Mustard', 'B6 Polythene Pam', 'B7 She Came In Through the Bathroom Window', 'B8 Golden Slumbers', 'B9 Carry That Weight', 'B10 The End', 'B11 Her Majesty'],
  },
  {
    artist: 'Daft Punk', country: 'Francja', title: 'Random Access Memories', year: 2013, genres: ['elektronika', 'pop', 'soul-funk'],
    desc: 'Hołd dla disco i studyjnego brzmienia lat 70. i 80., nagrany z żywymi muzykami, m.in. Nile’em Rodgersem i Giorgio Moroderem.',
    releases: [
      ['Columbia', '88883716861', 'Europa', 2013, '2×LP, gatefold', 'czarny'],
      ['Columbia', null, 'Europa', 2023, '3×LP, 10th Anniversary Edition', 'czarny'],
    ],
  },
  {
    artist: 'Daft Punk', country: 'Francja', title: 'Discovery', year: 2001, genres: ['elektronika'],
    desc: 'French house w najbardziej przebojowym wydaniu: „One More Time”, „Digital Love”, „Harder, Better, Faster, Stronger”.',
    releases: [
      ['Virgin', 'V2940', 'Europa', 2001, '2×LP', 'czarny'],
    ],
  },
  {
    artist: 'Kendrick Lamar', country: 'USA', title: 'To Pimp a Butterfly', year: 2015, genres: ['hip-hop', 'jazz', 'soul-funk'],
    desc: 'Gęsty, jazzowo-funkowy album o tożsamości i rasie w Ameryce. Laureat Grammy i stały bywalec list najlepszych płyt dekady.',
    releases: [
      ['Top Dawg / Aftermath / Interscope', null, 'USA', 2015, '2×LP, gatefold', 'czarny'],
    ],
  },
  {
    artist: 'Nas', country: 'USA', title: 'Illmatic', year: 1994, genres: ['hip-hop'],
    desc: 'Debiut z Queensbridge z produkcjami DJ Premiera, Pete Rocka i Q-Tipa. Wzorzec nowojorskiego rapu.',
    releases: [
      ['Columbia', 'C 57684', 'USA', 1994, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Nirvana', country: 'USA', title: 'Nevermind', year: 1991, genres: ['rock', 'punk'],
    desc: 'Płyta, która wyniosła grunge do mainstreamu. „Smells Like Teen Spirit”, „Come as You Are”, „Lithium”.',
    releases: [
      ['DGC', 'DGC-24425', 'USA', 1991, 'LP', 'czarny'],
      ['DGC / Geffen', null, 'Europa', 2009, 'LP, 180 g, reedycja', 'czarny'],
    ],
    tracks: ['A1 Smells Like Teen Spirit', 'A2 In Bloom', 'A3 Come as You Are', 'A4 Breed', 'A5 Lithium', 'A6 Polly', 'B1 Territorial Pissings', 'B2 Drain You', 'B3 Lounge Act', 'B4 Stay Away', 'B5 On a Plain', 'B6 Something in the Way'],
  },
  {
    artist: 'Radiohead', country: 'Wielka Brytania', title: 'OK Computer', year: 1997, genres: ['rock', 'elektronika'],
    desc: 'Niepokojąca wizja technologicznej przyszłości. „Paranoid Android”, „Karma Police”, „No Surprises”.',
    releases: [
      ['Parlophone', 'NODATA 02', 'Wielka Brytania', 1997, '2×LP', 'czarny'],
      ['XL Recordings', 'XLLP868', 'Europa', 2017, '3×LP, OKNOTOK 1997–2017', 'czarny'],
    ],
  },
  {
    artist: 'Michael Jackson', country: 'USA', title: 'Thriller', year: 1982, genres: ['pop', 'soul-funk'],
    desc: 'Najlepiej sprzedający się album w historii, wyprodukowany przez Quincy’ego Jonesa.',
    releases: [
      ['Epic', 'QE 38112', 'USA', 1982, 'LP, gatefold', 'czarny'],
      ['Epic', 'EPC 85930', 'Wielka Brytania', 1982, 'LP, gatefold', 'czarny'],
    ],
    tracks: ['A1 Wanna Be Startin’ Somethin’', 'A2 Baby Be Mine', 'A3 The Girl Is Mine', 'A4 Thriller', 'B1 Beat It', 'B2 Billie Jean', 'B3 Human Nature', 'B4 P.Y.T. (Pretty Young Thing)', 'B5 The Lady in My Life'],
  },
  {
    artist: 'Marvin Gaye', country: 'USA', title: 'What’s Going On', year: 1971, genres: ['soul-funk'],
    desc: 'Soulowy album koncepcyjny o wojnie, biedzie i ekologii, opowiedziany z perspektywy weterana z Wietnamu.',
    releases: [
      ['Tamla', 'TS 310', 'USA', 1971, 'LP, gatefold', 'czarny'],
    ],
  },
  {
    artist: 'Stevie Wonder', country: 'USA', title: 'Songs in the Key of Life', year: 1976, genres: ['soul-funk', 'pop'],
    desc: 'Monumentalny podwójny album z dodatkową EP-ką. „Sir Duke”, „I Wish”, „Isn’t She Lovely”.',
    releases: [
      ['Tamla', 'T13-340C2', 'USA', 1976, '2×LP + 7" EP, gatefold', 'czarny', 'Z książeczką i singlem „A Something’s Extra”'],
    ],
  },
  {
    artist: 'Amy Winehouse', country: 'Wielka Brytania', title: 'Back to Black', year: 2006, genres: ['soul-funk', 'pop'],
    desc: 'Retro-soul z produkcją Marka Ronsona i Salaama Remiego. „Rehab”, „Back to Black”, „Tears Dry on Their Own”.',
    releases: [
      ['Island', null, 'Europa', 2006, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Adele', country: 'Wielka Brytania', title: '21', year: 2011, genres: ['pop', 'soul-funk'],
    desc: 'Album o rozstaniu, który zdominował listy przebojów na całym świecie. „Rolling in the Deep”, „Someone Like You”.',
    releases: [
      ['XL Recordings', 'XLLP520', 'Wielka Brytania', 2011, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Metallica', country: 'USA', title: 'Master of Puppets', year: 1986, genres: ['metal'],
    desc: 'Szczytowe osiągnięcie thrash metalu i ostatni album z Cliffem Burtonem.',
    releases: [
      ['Elektra', '9 60439-1', 'USA', 1986, 'LP', 'czarny'],
      ['Music for Nations', 'MFN 60', 'Wielka Brytania', 1986, 'LP', 'czarny'],
    ],
    tracks: ['A1 Battery', 'A2 Master of Puppets', 'A3 The Thing That Should Not Be', 'A4 Welcome Home (Sanitarium)', 'B1 Disposable Heroes', 'B2 Leper Messiah', 'B3 Orion', 'B4 Damage, Inc.'],
  },
  {
    artist: 'Black Sabbath', country: 'Wielka Brytania', title: 'Paranoid', year: 1970, genres: ['metal', 'rock'],
    desc: 'Fundament heavy metalu: „War Pigs”, „Paranoid”, „Iron Man”.',
    releases: [
      ['Vertigo', '6360 011', 'Wielka Brytania', 1970, 'LP, gatefold', 'czarny', 'Label „swirl”'],
    ],
  },
  {
    artist: 'Led Zeppelin', country: 'Wielka Brytania', title: 'Led Zeppelin IV', year: 1971, genres: ['rock'],
    desc: 'Album bez tytułu na okładce, znany z „Stairway to Heaven”, „Black Dog” i „When the Levee Breaks”.',
    releases: [
      ['Atlantic', '2401012', 'Wielka Brytania', 1971, 'LP, gatefold', 'czarny'],
      ['Atlantic', null, 'Europa', 2014, 'LP, 180 g, remaster Jimmy’ego Page’a', 'czarny'],
    ],
  },
  {
    artist: 'Fleetwood Mac', country: 'Wielka Brytania', title: 'Rumours', year: 1977, genres: ['rock', 'pop'],
    desc: 'Nagrany w czasie rozpadu związków w zespole. „Dreams”, „Go Your Own Way”, „The Chain”.',
    releases: [
      ['Warner Bros. Records', 'BSK 3010', 'USA', 1977, 'LP', 'czarny'],
      ['Warner Bros. Records', 'K 56344', 'Wielka Brytania', 1977, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'John Coltrane', country: 'USA', title: 'A Love Supreme', year: 1965, genres: ['jazz'],
    desc: 'Duchowa suita w czterech częściach nagrana z klasycznym kwartetem Coltrane’a.',
    releases: [
      ['Impulse!', 'A-77', 'USA', 1965, 'LP, gatefold, mono', 'czarny'],
      ['Impulse!', 'AS-77', 'USA', 1965, 'LP, gatefold, stereo', 'czarny'],
    ],
    tracks: ['A1 Part 1 – Acknowledgement', 'A2 Part 2 – Resolution', 'B1 Part 3 – Pursuance', 'B2 Part 4 – Psalm'],
  },
  {
    artist: 'Krzysztof Komeda', country: 'Polska', title: 'Astigmatic', year: 1966, genres: ['jazz'],
    desc: 'Najważniejsza płyta polskiego jazzu, nagrana z Tomaszem Stańką, Zbigniewem Namysłowskim i Rune Carlssonem.',
    releases: [
      ['Polskie Nagrania Muza', 'XL 0298', 'Polska', 1966, 'LP, mono', 'czarny', 'Seria Polish Jazz vol. 5'],
      ['Warner Music Poland', null, 'Polska', 2016, 'LP, 180 g, reedycja', 'czarny'],
    ],
    tracks: ['A1 Astigmatic', 'B1 Kattorna', 'B2 Svantetic'],
  },
  {
    artist: 'Czesław Niemen', country: 'Polska', title: 'Enigmatic', year: 1970, genres: ['rock', 'soul-funk'],
    desc: 'Album z „Bema pamięci żałobnym rapsodem” do słów Norwida. Kamień milowy polskiego rocka progresywnego.',
    releases: [
      ['Polskie Nagrania Muza', null, 'Polska', 1970, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Kult', country: 'Polska', title: 'Spokojnie', year: 1988, genres: ['rock', 'punk'],
    desc: 'Klasyka polskiego rocka z „Arahją”, „Do Ani” i „Polską”.',
    releases: [
      ['Polton', null, 'Polska', 1988, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Republika', country: 'Polska', title: 'Nowe sytuacje', year: 1983, genres: ['rock', 'punk'],
    desc: 'Debiut zespołu Grzegorza Ciechowskiego, nowofalowa klasyka z „Kombinatem” i „Nowymi sytuacjami”.',
    releases: [
      ['Polton', null, 'Polska', 1983, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Paktofonika', country: 'Polska', title: 'Kinematografia', year: 2000, genres: ['hip-hop'],
    desc: 'Jedyny studyjny album katowickiego składu, jeden z najważniejszych w historii polskiego rapu.',
    releases: [
      ['Gigant Records', null, 'Polska', 2000, '2×LP', 'czarny'],
    ],
  },
  {
    artist: 'Kraftwerk', country: 'Niemcy', title: 'Trans Europa Express', year: 1977, genres: ['elektronika'],
    desc: 'Elektroniczna podróż przez Europę, która zainspirowała synth-pop, hip-hop i techno.',
    releases: [
      ['Kling Klang / EMI', null, 'Niemcy', 1977, 'LP', 'czarny'],
      ['Kling Klang / Parlophone', null, 'Europa', 2009, 'LP, 180 g, remaster', 'czarny'],
    ],
  },
  {
    artist: 'Aphex Twin', country: 'Wielka Brytania', title: 'Selected Ambient Works 85–92', year: 1992, genres: ['elektronika'],
    desc: 'Domowe nagrania Richarda D. Jamesa, które zdefiniowały ambient techno.',
    releases: [
      ['Apollo', 'AMB 3922', 'Belgia', 1992, '2×LP', 'czarny'],
    ],
  },
  {
    artist: 'Massive Attack', country: 'Wielka Brytania', title: 'Mezzanine', year: 1998, genres: ['elektronika'],
    desc: 'Mroczny trip-hop z „Teardrop” z wokalem Elizabeth Fraser i „Angel”.',
    releases: [
      ['Circa / Virgin', 'WBRLP 4', 'Wielka Brytania', 1998, '2×LP', 'czarny'],
    ],
  },
  {
    artist: 'Joy Division', country: 'Wielka Brytania', title: 'Unknown Pleasures', year: 1979, genres: ['punk'],
    desc: 'Debiut z kultową okładką Petera Saville’a przedstawiającą sygnał pulsara.',
    releases: [
      ['Factory', 'FACT 10', 'Wielka Brytania', 1979, 'LP', 'czarny', 'Teksturowana okładka'],
    ],
  },
  {
    artist: 'The Clash', country: 'Wielka Brytania', title: 'London Calling', year: 1979, genres: ['punk', 'rock', 'reggae'],
    desc: 'Podwójny album łączący punk z reggae, rockabilly i ska.',
    releases: [
      ['CBS', 'CLASH 3', 'Wielka Brytania', 1979, '2×LP', 'czarny'],
    ],
  },
  {
    artist: 'Bob Marley & The Wailers', country: 'Jamajka', title: 'Exodus', year: 1977, genres: ['reggae'],
    desc: 'Nagrany na emigracji w Londynie. „Jamming”, „Three Little Birds”, „One Love/People Get Ready”.',
    releases: [
      ['Island', 'ILPS 9498', 'Wielka Brytania', 1977, 'LP', 'czarny'],
    ],
  },
  {
    artist: 'Glenn Gould', country: 'Kanada', title: 'Bach: The Goldberg Variations', year: 1956, genres: ['klasyczna'],
    desc: 'Debiutanckie, brawurowe nagranie Wariacji Goldbergowskich, które uczyniło Goulda gwiazdą.',
    releases: [
      ['Columbia Masterworks', 'ML 5060', 'USA', 1956, 'LP, mono', 'czarny'],
    ],
  },
  {
    artist: 'Ennio Morricone', country: 'Włochy', title: 'Il buono, il brutto, il cattivo', year: 1966, genres: ['filmowa'],
    desc: 'Ścieżka dźwiękowa do „Dobrego, złego i brzydkiego” Sergia Leone z „The Ecstasy of Gold”.',
    releases: [
      ['United Artists', null, 'USA', 1967, 'LP', 'czarny'],
    ],
  },
];

export function seed(db: Database.Database) {
  const slug = (s: string) =>
    s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  {
    const insGenre = db.prepare('INSERT INTO genres (name, slug) VALUES (?, ?)');
    for (const [name, s] of GENRES) insGenre.run(name, s);
    const genreId = new Map(
      (db.prepare('SELECT id, slug FROM genres').all() as { id: number; slug: string }[]).map((g) => [g.slug, g.id]),
    );

    const findArtist = db.prepare('SELECT id FROM artists WHERE name = ?');
    const insArtist = db.prepare('INSERT INTO artists (name, slug, country) VALUES (?, ?, ?)');
    const insAlbum = db.prepare('INSERT INTO albums (title, slug, artist_id, year, description) VALUES (?, ?, ?, ?, ?)');
    const insAG = db.prepare('INSERT INTO album_genres (album_id, genre_id) VALUES (?, ?)');
    const insRel = db.prepare(
      'INSERT INTO releases (album_id, label, catalog_no, country, year, format, vinyl_color, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const insTrack = db.prepare('INSERT INTO tracks (album_id, position, title, sort) VALUES (?, ?, ?, ?)');

    for (const a of ALBUMS) {
      const artist = findArtist.get(a.artist) as { id: number } | undefined;
      const artistId = artist?.id ?? Number(insArtist.run(a.artist, slug(a.artist), a.country).lastInsertRowid);
      const albumId = Number(insAlbum.run(a.title, slug(`${a.artist} ${a.title}`), artistId, a.year, a.desc).lastInsertRowid);
      for (const g of a.genres) insAG.run(albumId, genreId.get(g));
      for (const r of a.releases) insRel.run(albumId, r[0], r[1], r[2], r[3], r[4], r[5] ?? null, r[6] ?? null);
      a.tracks?.forEach((t, i) => {
        const [pos, ...rest] = t.split(' ');
        insTrack.run(albumId, pos, rest.join(' '), i);
      });
    }

    // Konto demonstracyjne z przykładową półką
    const demoId = Number(
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('demo', hashPassword('demo1234')).lastInsertRowid,
    );
    const albumBySlug = db.prepare('SELECT id FROM albums WHERE slug = ?');
    const insShelf = db.prepare('INSERT INTO shelf (user_id, album_id, status, rating) VALUES (?, ?, ?, ?)');
    const firstRelease = db.prepare('SELECT id FROM releases WHERE album_id = ? ORDER BY year, id LIMIT 1');
    const insUR = db.prepare('INSERT INTO user_releases (user_id, release_id, status) VALUES (?, ?, ?)');
    const demoShelf: [string, string, number | null][] = [
      ['miles-davis-kind-of-blue', 'mam', 10],
      ['pink-floyd-the-dark-side-of-the-moon', 'mam', 9],
      ['krzysztof-komeda-astigmatic', 'mam', 10],
      ['daft-punk-random-access-memories', 'mam', 8],
      ['radiohead-ok-computer', 'chce', null],
      ['john-coltrane-a-love-supreme', 'chce', null],
      ['joy-division-unknown-pleasures', 'chce', null],
      ['kendrick-lamar-to-pimp-a-butterfly', 'sluchalem', 9],
      ['nirvana-nevermind', 'sluchalem', 7],
    ];
    for (const [s, status, rating] of demoShelf) {
      const album = albumBySlug.get(s) as { id: number };
      insShelf.run(demoId, album.id, status, rating);
      if (status !== 'sluchalem') {
        const rel = firstRelease.get(album.id) as { id: number };
        insUR.run(demoId, rel.id, status);
      }
    }
  }
}
