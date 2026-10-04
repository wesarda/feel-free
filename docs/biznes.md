# Model biznesowy, utrzymanie i rozwój

## Propozycja wartości

| Segment | Problem | Co dostaje | Płaci? |
|---|---|---|---|
| **Mieszkańcy i turyści** (osoby na wózkach, rodzice z wózkami, seniorzy) | nie wiedzą, czy wejdą i przejadą | sprawdzenie miejsc i tras pod własne potrzeby, z wiarygodnością danych | **nie, zawsze za darmo**, bez reklam i bez profilowania |
| **Właściciele i zarządcy obiektów** (muzea, restauracje, sklepy, zarządcy nieruchomości) | goście pytają o dostępność, a informacja w sieci jest nieaktualna lub błędna | profil z deklaracją za darmo; po weryfikacji zdjęć (AI i moderator) znaczek ✓ na mapie i certyfikat; przypomnienia o potwierdzeniu aktualności | tak (weryfikacja, audyt) |
| **Hotele** | goście z niepełnosprawnościami i rodziny rezerwują tam, gdzie mają pewność | znaczek ✓ i certyfikat, widżet na stronie, trasy z hotelu do atrakcji | tak (weryfikacja, audyt) |
| **Organizatorzy wydarzeń** (koncerty, konferencje, festiwale) | muszą informować o dostępności miejsca, dojazdu i toalet | strona dostępności wydarzenia: obiekt + trasy od przystanków i parkingów + toalety + kod QR | możliwe później |
| **Systemy rezerwacyjne, mapy, aplikacje turystyczne** | brak ustrukturyzowanych danych o dostępności z pochodzeniem | API z danymi znormalizowanymi, źródłem, datą i poziomem wiarygodności | możliwe później |
| **Miasta i instytucje** | nie chcą utrzymywać własnej bazy, ale potrzebują informacji | instancja z marką miasta, panel braków danych i zgłaszanych barier, integracja otwartych danych | opcjonalnie |

## Źródła przychodu

Użytkownicy płacą zawsze 0 zł. Płacą miejsca, za sprawdzenie informacji o dostępności.

| Produkt | Cena | Uwagi |
|---|---|---|
| Profil miejsca i deklaracja właściciela | 0 zł | buduje bazę; oznaczenie „deklaracja właściciela” |
| **Weryfikacja: znaczek ✓ i certyfikat** | **ok. 30 zł / rok** (cena orientacyjna, sprawdzimy ją w pilotażu) | właściciel wysyła zdjęcia, AI porównuje je z deklaracją, moderator zatwierdza; znaczek na mapie i certyfikat PDF, ważne 12 miesięcy |
| Audyt na miejscu (z partnerem) | 900–1 500 zł jednorazowo | wykonują audytorzy organizacji partnerskich; podział przychodu z partnerem; najwyższy poziom „zweryfikowane na miejscu” |

Możliwe później: strona dostępności wydarzenia dla organizatorów, API danych dla systemów rezerwacyjnych, wersja z marką miasta.

### Jak działa weryfikacja

1. Właściciel wysyła zdjęcia według instrukcji: wejście (z boku, widać stopnie), drzwi z miarką, toaleta, winda.
2. AI porównuje zdjęcia z deklaracją: liczba stopni, podjazd, szerokość drzwi, poręcze, drzwi automatyczne. Zaznacza to, czego nie da się ocenić ze zdjęć.
3. Moderator sprawdza wynik AI i zatwierdza albo odsyła listę poprawek.
4. Miejsce dostaje znaczek ✓ „Zweryfikowane” na mapie i certyfikat PDF z datą ważności (12 miesięcy), do wywieszenia i na stronę www.

Zasady, które chronią wiarygodność:

- Płaci się za sprawdzenie, nie za wynik. Gdy zdjęcia nie potwierdzają deklaracji, znaczka nie ma.
- Znaczek wygasa po roku; potwierdzone zgłoszenia użytkowników (np. zepsuta winda od miesiąca) mogą go zawiesić do ponownego sprawdzenia.
- Na mapie i w certyfikacie widać, jak sprawdzono: zdjęcia (AI i moderator) albo audyt na miejscu.

**Cena i opłacalność**: weryfikacja kosztuje ok. 30 zł rocznie (cena orientacyjna), żeby było na nią stać także małe lokale; ostateczną cenę sprawdzimy w pilotażu z właścicielami. Koszty jednego miasta to ok. 30–55 tys. zł rocznie (poniżej), więc pokrywa je ok. 1 000–1 800 zweryfikowanych miejsc rocznie, plus marża z audytów. Większość pracy wykonuje AI, a moderator tylko zatwierdza wynik, dlatego niska cena jest możliwa. Rozwój produktu finansujemy z grantów i pilotaży.

**Licencje danych**: dane pochodne z OpenStreetMap pozostają na licencji ODbL i wracają do społeczności. Zarabiamy na usłudze (normalizacja, weryfikacja, aktualność, SLA, widżety, audyty) oraz na danych własnych (deklaracje, audyty), które licencjonujemy osobno.

## Kto prowadzi usługę (poza infrastrukturą UMK)

| Rola | Kto | Zakres |
|---|---|---|
| **Operator / właściciel produktu** | spółka zespołu (np. prosta spółka akcyjna, docelowo przedsiębiorstwo społeczne) | rozwój, hosting, aktualizacje, bezpieczeństwo, moderacja zgłoszeń, obsługa klientów B2B, RODO |
| **Partnerzy merytoryczni** | organizacje osób z niepełnosprawnościami i rodziców | audyty na miejscu (płatne), testy użyteczności, weryfikacja zgłoszeń, promocja |
| **Społeczność OpenStreetMap** | lokalni maperzy | poprawki danych u źródła, mapathony |
| **Miasto** | Urząd Miasta Krakowa (opcjonalnie) | otwarte dane, promocja; **bez obowiązku utrzymania bazy i bez dostępu do systemów wewnętrznych** |

## Koszty utrzymania (jedno miasto)

| Pozycja | Miesięcznie |
|---|---|
| Hosting aplikacji statycznej (Cloudflare Pages / Vercel / Netlify) | 0–90 zł |
| Własna instancja Overpass (VPS w UE) | 200–350 zł |
| Kafelki mapy (OpenFreeMap lub własne PMTiles) | 0–50 zł |
| Baza zgłoszeń i kont (PostgreSQL / Supabase) | ok. 110 zł |
| Kopie zapasowe, monitoring, domena | ok. 50 zł |
| Moderacja i obsługa (0,25–0,5 etatu) | 2 000–4 000 zł |
| **Razem** | **ok. 2,5–4,5 tys. zł** |

Kolejne miasto kosztuje głównie moderację (ok. 1 tys. zł miesięcznie), bo infrastruktura jest współdzielona.

## Plan przejścia od prototypu do usługi

**0–3 miesiące: pilotaż w Krakowie**

- Serwer zgłoszeń z moderacją, notatki OSM dla poprawek.
- Panel właściciela z weryfikacją uprawnień.
- Własna instancja Overpass.
- 50 obiektów pilotażowych: muzea, hotele, obiekty wydarzeń.
- Testy z prawdziwymi ludźmi: 50–100 osób. Najwięcej osób na wózkach i rodziców z wózkami dziecięcymi, bo to nasi główni użytkownicy; do tego osoby z problemami wzroku. Mniejsze grupy: seniorzy i osoby z innymi niepełnosprawnościami (np. słuchu, intelektualną, chorobami przewlekłymi).
- Asystent głosowy dla osób z problemami wzroku, pierwsza wersja do testów: mówi, gdzie skręcić i jak iść, uprzedza o schodach, krawężnikach i przejściach dla pieszych. (W prototypie jest już czytanie miejsc i całych tras na głos; w pilotażu dochodzi prowadzenie na żywo z lokalizacją.)
- Audyt WCAG.
- Tryb dla osób słabowidzących: wysoki kontrast, większy tekst, kolory rozróżnialne przy daltonizmie. (Większy tekst i wysoki kontrast są już w prototypie; w pilotażu testy z użytkownikami i mapa o wysokim kontraście.)
- Finansowanie: granty na rozwój (np. programy dostępności finansowane ze środków UE i PFRON), pierwsze umowy B2B.

**3–6 miesięcy: rozszerzenie**

- Aplikacja na telefon (Android, iOS): działanie offline, powiadomienia o zepsutych windach na zapisanych trasach.
- Moduł wydarzeń.
- Komunikacja miejska: przystanki, niskopodłogowość, dane czasu rzeczywistego.
- Przejścia podziemne i windy z informacją o awariach.
- Nowe dane o miejscach: dla osób niewidomych i słabowidzących (oznaczenia fakturowe, informacja głosowa w budynkach) i dla osób głuchych (pętle indukcyjne).
- API dla pierwszych partnerów.

**6–12 miesięcy: kolejne miasta i nowe funkcje**

- Rozwój w kolejnych miastach: drugie i trzecie miasto.
- Nowe funkcje dodajemy na bieżąco, według potrzeb użytkowników z pilotażu.
- Asystent głosowy w pełnej wersji: prowadzenie w czasie rzeczywistym (skręty, przejścia, krawężniki, ścieżki dotykowe, sygnalizacja dźwiękowa), we współpracy z czytnikami ekranu i z testami w organizacjach osób niewidomych.
- Integracje z systemami rezerwacyjnymi.
- Panel dla miast.

**Wskaźniki**: odsetek miejsc z pełnym kompletem danych dla profilu, mediana wieku danych, liczba potwierdzeń i poprawek miesięcznie, czas reakcji na zgłoszenie, liczba obiektów zweryfikowanych, liczba osadzonych widżetów, przychód B2B.

## Uruchomienie w kolejnym mieście

Warunki:

1. **Plik konfiguracji miasta** (obszar, przykładowe trasy, lista zbiorów danych). Technicznie 1–2 dni.
2. **Raport pokrycia danych OSM** (już w prototypie: „O danych” i `meta.json`): odsetek miejsc z informacją o dostępności, stopniach, drzwiach, toalecie i przewijaku oraz świeżość danych. Planowane rozszerzenie o chodniki z nawierzchnią i przejścia z krawężnikami. Przy niskim pokryciu prowadzimy mapathon z lokalnymi organizacjami (4–8 tygodni).
3. **Lokalny partner merytoryczny** do audytów i testów.
4. **Opcjonalnie** adaptery lokalnych otwartych danych i umowa z miastem na instancję z jego marką.

## Rynek

- W Polsce żyje ok. 5,4 mln osób z niepełnosprawnościami, czyli 14,3% ludności (GUS, Narodowy Spis Powszechny 2021), i ponad 7,7 mln osób w wieku 65+ (GUS, 2024). Do tego rodzice małych dzieci i osoby z czasowymi urazami: potrzeby „bez schodów” dotyczą dużej części społeczeństwa.
- W UE to ok. 87 mln osób z niepełnosprawnościami (Strategia UE na rzecz praw osób z niepełnosprawnościami 2021–2030).
- Kraków odwiedziło w 2024 r. ok. 14,7 mln osób (badanie ruchu turystycznego Małopolskiej Organizacji Turystycznej).
- **Regulacje zwiększają popyt na rzetelną informację o dostępności**: ustawa o zapewnianiu dostępności osobom ze szczególnymi potrzebami (2019), ustawa o dostępności cyfrowej (2019, deklaracje dostępności z częścią architektoniczną), Europejski Akt o Dostępności (stosowany od 28 czerwca 2025).

## Ryzyka

| Ryzyko | Ograniczenie |
|---|---|
| Niska jakość lub pokrycie danych OSM | stan „za mało danych” zamiast fałszywej pewności; deklaracje właścicieli; mapathony; raport pokrycia przed wejściem do miasta |
| Nieaktualne dane | daty przy faktach, przypomnienia dla właścicieli, wygasanie zgłoszeń, potwierdzenia użytkowników |
| Nadużycia w zgłoszeniach | moderacja, limity, zgłoszenie nigdy nie nadpisuje danych potwierdzonych |
| Zależność od darmowych usług (Overpass, OpenFreeMap) | kopia nocna, własna instancja Overpass, możliwość zmiany dostawcy kafelków |
| Odpowiedzialność za błędną informację | jasne poziomy wiarygodności, „niepotwierdzone ≠ zapewnienie dostępności”, regulamin |
