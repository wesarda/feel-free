# Zgłoszenie projektu (HackTribe) — wyzwanie „Kraków bez barier”

Gotowe teksty i lista załączników do formularza zgłoszenia. Zgłoszenie musi być po polsku i trafić do oceny do niedzieli 4 października, godz. 11:00.

## Pola formularza

| Pole | Treść |
|---|---|
| **Tytuł projektu** | Feel Free – dostępne miejsca i trasy w Krakowie |
| **ID zespołu** | *(do uzupełnienia — numer zespołu z HackTribe)* |
| **Opis projektu** | patrz niżej |
| **Prezentacja PDF** (maks. 10 slajdów) | `docs/prezentacja/prezentacja.pdf` (10 slajdów) |
| **Film mp4** (maks. 3 minuty) | `docs/prezentacja/feelfree-mobile.mp4` (1 min) |
| **Repozytorium kodu** | to repozytorium |
| **Link do demonstracji** | https://feelfree.team |

## Opis projektu (do wklejenia)

**Feel Free** to strona na telefon i komputer, na której mieszkaniec albo turysta sprawdza, czy *on sam* wejdzie do wybranego miejsca i przejedzie wybraną trasą w Krakowie. Zamiast jednego znaczka „dostępne / niedostępne” pokazujemy konkretne fakty: stopnie, próg, podjazd i jego nachylenie, szerokość drzwi, windę, toaletę, przewijak, nawierzchnię, miejsca odpoczynku.

Użytkownik wybiera, jak się porusza (wózek inwalidzki, wózek dziecięcy, trudności z chodzeniem), i może doprecyzować szczegóły. Nie pytamy o zdrowie ani o niepełnosprawność. Każde miejsce dostaje ocenę z uzasadnieniem, a każda informacja ma **źródło, datę i poziom wiarygodności**. Gdy źródła się różnią, pokazujemy obie wersje. Dane starsze niż 3 lata są oznaczone. Brak danych nigdy nie jest przedstawiany jako dostępność.

Trasę liczymy po sieci chodników z OpenStreetMap. Najpierw pokazujemy zwykłą, najkrótszą drogę i to, co na niej stoi użytkownikowi na przeszkodzie (schody, krawężniki, bruk), a potem proponujemy łatwiejszą trasę, nawet jeśli jest trochę dłuższa. Wejście do miejsca można obejrzeć w 3D.

Miasto nie utrzymuje żadnej bazy i nie udostępnia systemów wewnętrznych: dane pochodzą na żywo z OpenStreetMap i z otwartych danych miasta (rejestr przystanków ZTP z portalu Otwarte Dane Miasta Krakowa: krawężnik i nawierzchnia peronu, wiaty, ławki), a co noc zapisuje się kopia zapasowa. Do tego dochodzą deklaracje właścicieli, audyty partnerów i zgłoszenia użytkowników, zawsze wyraźnie oznaczone jako niezweryfikowane. Gdy źródło nie odpowiada, aplikacja mówi to wprost i pokazuje kopię z datą.

Rozwiązanie jest gotowe do wdrożenia u innych: kartę dostępności dowolnego miejsca można osadzić na stronie hotelu, organizatora wydarzenia czy zarządcy obiektu jedną linią kodu, a kolejne miasto to jeden plik konfiguracji. Dla ludzi usługa jest zawsze bezpłatna; zarabiamy na weryfikacji i audytach obiektów, stronach dostępności wydarzeń i API dla systemów rezerwacyjnych.

Interfejs jest po polsku i po angielsku i jest projektowany pod WCAG 2.2 AA: obsługa klawiaturą, czytnik ekranu, kontrast, tekstowa lista zamiast mapy, tryb większego tekstu i wysokiego kontrastu oraz czytanie miejsc i tras na głos.

## Wymagania wyzwania i miejsce, w którym je spełniamy

### Wymagania formalne (pkt 4)

| Wymaganie | Gdzie |
|---|---|
| Opis rozwiązania i wskazanie problemu | `README.md`, `docs/rozwiazanie.md` |
| Prototyp lub demonstracja | https://feelfree.team, kod w `app/`, scenariusz w `docs/demo.md` |
| Grupa docelowa i sposób wykorzystania | `docs/rozwiazanie.md` (grupa docelowa, trzy scenariusze użycia) |
| Źródła danych, ocena aktualności i wiarygodności | `docs/dane.md` |
| Model biznesowy i dalszy rozwój | `docs/biznes.md` |
| Prezentacja PDF, maks. 10 slajdów | `docs/prezentacja/prezentacja.pdf` |
| Film, maks. 3 minuty, w otwartym repozytorium | `docs/prezentacja/feelfree-mobile.mp4` |

### Oczekiwany rezultat (pkt 3)

| Prototyp powinien… | Jak to robi |
|---|---|
| prezentować konkretne bariery i udogodnienia | karta miejsca: stopnie, próg, podjazd, podnośnik, szerokość drzwi, winda, toaleta, przewijak, nawierzchnia, miejsca odpoczynku; trasa: schody, krawężniki, nawierzchnia, nachylenie, ławki, toalety |
| wskazywać źródło, datę i poziom wiarygodności | przy każdym fakcie w karcie miejsca; na trasie pod każdą pozycją („Źródło”) |
| korzystać z dostępnych źródeł bez ręcznej bazy Miasta | OpenStreetMap i otwarte dane miasta (przystanki ZTP) na żywo + kopia nocna (GitHub Actions) |
| nie wymagać dostępu do systemów UMK lub MJO | tylko publiczne dane i usługi (lista w `docs/dane.md`) |
| uwzględniać potrzeby wybranej grupy | profile: wózek inwalidzki, wózek dziecięcy, trudności z chodzeniem; każde ustawienie można zmienić |
| być łatwy w użyciu i wdrożeniu | układ jak w aplikacjach map; karta do osadzenia jedną linią (`?embed=`) |
| pokazywać potencjał rozwoju i skalowania | `docs/biznes.md`; nowe miasto = jeden plik konfiguracji (`docs/architektura.md`) |

### Wymagania techniczne i organizacyjne (pkt 5)

| Wymaganie | Gdzie |
|---|---|
| Główny scenariusz: wyszukanie miejsca lub trasy i informacje o dostępności | aplikacja; `docs/demo.md` |
| Pozyskiwanie danych oddzielone od prezentacji; komponenty, przepływ danych, dodawanie źródeł, kategorii i obszarów | `docs/architektura.md` |
| Dane miejskie: zbiory lub API, sposób pobierania, częstotliwość, niedostępność źródła | `docs/dane.md`; w aplikacji działa zbiór miejski „Przystanki Komunikacji Miejskiej w Krakowie” (ZTP, portal Otwarte Dane Miasta Krakowa): pobieranie na żywo, kopia nocna, stan źródła w „O danych”; kolejne nazwane zbiory: P+R, GTFS, listy obiektów miejskich |
| Źródło, data i status wiarygodności przy każdej informacji; zgłoszenia odróżnione od danych potwierdzonych; poprawianie danych | `docs/dane.md` (poziomy wiarygodności, poprawianie błędnych danych) |
| WCAG 2.2 AA jako cel; wykaz funkcji gotowych i wymagających pracy | `docs/dostepnosc.md` |
| Uruchomienie i utrzymanie poza infrastrukturą UMK: operator, hosting, bezpieczeństwo, zgłoszenia, koszty | `docs/biznes.md` (kto prowadzi usługę, koszty utrzymania) |
| Ochrona danych i bezpieczeństwo; bez pytań o niepełnosprawność | `docs/bezpieczenstwo.md` |
| Zależności, licencje, przenośność, kolejne miasto | `docs/architektura.md` (stos technologiczny i zależności, „Jak dodać… nowe miasto”) |

### Testowanie i walidacja (pkt 6)

| Wymaganie | Gdzie |
|---|---|
| Działająca demonstracja dla wybranej grupy | `docs/demo.md`, kroki 1–10 |
| Pochodzenie i data informacji; dane niepełne, nieaktualne, niezweryfikowane; oznaczenie danych przykładowych | `docs/demo.md`, kroki 3–7; etykieta „Dane przykładowe” |
| Przypadek danych sprzecznych, niepełnych albo niedostępnego źródła | `docs/demo.md`, kroki 4, 6 i 11; `docs/dane.md` |
| Kontrola dostępności głównego scenariusza, ograniczenia i plan | `docs/dostepnosc.md` |
| Plan przejścia od prototypu do usługi | `docs/biznes.md` |
