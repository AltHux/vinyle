export const metadata = { title: 'Zasady serwisu' };

export default function Page() {
  return (
    <div className="form-page">
      <h1>Zasady serwisu</h1>
      <ol>
        <li>Konto w Vinyle może założyć osoba, która ukończyła 16 lat.</li>
        <li>Jedna osoba zakłada jedno konto i nie udostępnia hasła innym.</li>
        <li>Dodając płyty, wydania, okładki i opinie, dbasz o rzetelność danych i nie naruszasz cudzych praw, w tym praw autorskich.</li>
        <li>Zdjęcie profilowe i opis nie mogą zawierać treści obraźliwych, wulgarnych ani niezgodnych z prawem. Takie treści usuwamy.</li>
        <li>Przechowujemy nazwę użytkownika, adres e-mail, datę urodzenia (tylko do sprawdzenia wieku, nie jest pokazywana innym), zdjęcie profilowe oraz Twoją półkę i opinie. Adres e-mail służy do potwierdzenia konta i odzyskiwania hasła.</li>
        <li>Możesz w każdej chwili poprosić o usunięcie konta i danych.</li>
      </ol>
    </div>
  );
}
