# Opis rozwiązania

## Problem

Kraków odwiedzają mieszkańcy i turyści o bardzo różnych potrzebach. Dla osoby na wózku barierą są już dwa stopnie albo krawężnik bez obniżenia. Rodzic z wózkiem dziecięcym wniesie wózek po dwóch stopniach, ale nie po dwunastu, i szuka przewijaka. Osoba z trudnościami w chodzeniu potrzebuje ławki co kilkaset metrów i poręczy przy schodach.

Dziś informacja o dostępności:

- **jest zbyt ogólna**: symbol „dostępne” nie mówi, czy podjazd ma 6% czy 12%, a drzwi 75 czy 120 cm;
- **jest rozproszona**: OpenStreetMap, strony instytucji, deklaracje dostępności, opinie w serwisach, zdjęcia;
- **nie ma źródła ani daty**: nie wiadomo, czy informacja jest sprzed tygodnia, czy sprzed 8 lat, i kto ją podał;
- **myli brak danych z dostępnością**: miejsce bez informacji o schodach często wygląda jak miejsce bez schodów.

## Rozwiązanie w jednym zdaniu

Aplikacja internetowa, która porównuje konkretne fakty o miejscu lub trasie z potrzebami użytkownika. Każdy fakt podaje źródło, datę i wiarygodność, a karta dostępności działa jako widżet na stronach hoteli, organizatorów i właścicieli obiektów.

## Grupa docelowa prototypu

Zgodnie z wyzwaniem prototyp jest ograniczony do potrzeb ruchowych:

| Grupa | Co jest kluczowe | Domyślne ustawienia profilu |
|---|---|---|
| **Osoby poruszające się na wózku** | stopnie, podjazdy (nachylenie), podnośniki, szerokość drzwi, progi, krawężniki, windy, toaleta, nawierzchnia | 0 stopni, krawężnik do 3 cm, drzwi ≥ 80 cm, podjazd do 8%, unikam bruku, potrzebuję windy i przystosowanej toalety |
| **Rodzice z wózkami dziecięcymi** | liczba stopni, krawężniki, wąskie przejścia, przewijak, winda | do 2 stopni, krawężnik do 7 cm, drzwi ≥ 70 cm, podjazd do 10%, przewijak, winda |
| **Osoby z trudnościami w chodzeniu** (rozszerzenie) | schody i poręcze, miejsca odpoczynku, odległości, nierówna nawierzchnia | do 3 stopni, krawężnik do 10 cm, miejsca odpoczynku, wolniejsze tempo |

Profil to tylko punkt startowy. Każde ustawienie można zmienić („Dostosuj szczegóły”). **Nie pytamy o niepełnosprawność ani zdrowie**, tylko o bariery i udogodnienia, zgodnie z wymaganiem wyzwania. Ustawienia zapisują się wyłącznie w przeglądarce użytkownika.

Kolejne grupy (osoby niewidome i słabowidzące, osoby głuche, seniorzy) wymagają tylko nowych atrybutów i reguł oceny. Model danych jest na to przygotowany: patrz `docs/architektura.md`.

## Jak się z tego korzysta

### Mieszkanka na wózku sprawdza muzeum

1. Wybiera „Wózek inwalidzki”.
2. Wyszukuje muzeum i otwiera kartę.
3. Widzi wynik, np. *Z utrudnieniami*, oraz listę konkretnych faktów:
   - ✓ 2 stopnie i podjazd (nachylenie 6%). Źródło: deklaracja właściciela, 12 mar 2026, oficjalne.
   - ✓ Drzwi 120 cm. ⚠ *Inne źródło podaje co innego:* 75 cm (zgłoszenie użytkownika z 28 wrz 2026, niezweryfikowane: „boczne drzwi, gdy główne są zamknięte”).
   - ⚠ Wokół wejścia kostka brukowa. Źródło: OpenStreetMap, 2 cze 2024, społeczność.
4. Sama ocenia, czy to jej wystarcza, bo widzi wszystkie fakty, a nie jedną etykietę.
5. Na miejscu może potwierdzić aktualność informacji albo zgłosić zmianę.

### Turysta z wózkiem dziecięcym sprawdza trasę

1. Wybiera „Wózek dziecięcy”, zakładkę „Trasa”, start „Kraków Główny” i cel „Sukiennice”.
2. Dostaje trasę omijającą schody dłuższe niż 2 stopnie, z listą: krawężniki (znane i bez danych), odcinki bruku z długością, ławki, toalety w pobliżu, zgłoszenia użytkowników.
3. Widzi najpierw zwykłą trasę i to, co na niej stoi mu na drodze (*14 stopni: bariera dla Ciebie*), a potem proponowaną łatwiejszą trasę, *dłuższą o 180 m*.
4. Po zmianie profilu na „Wózek inwalidzki” trasa przelicza się od razu.

### Hotel pokazuje dostępność na swojej stronie

1. Recepcja otwiera kartę hotelu w aplikacji, klika „Udostępnij lub osadź” i kopiuje jedną linię `<iframe>`.
2. Na stronie hotelu goście widzą aktualne fakty z datą i źródłem, z przełącznikiem potrzeb.
3. Hotel aktualizuje informacje deklaracją właściciela (w usłudze: z weryfikacją).

## Co odróżnia to rozwiązanie

- **Wynik zależny od potrzeb**, a nie jeden znaczek: ta sama kawiarnia jest „barierą” dla osoby na wózku i „z utrudnieniami” dla rodzica z wózkiem.
- **Przejrzystość danych na poziomie pojedynczego faktu**: źródło, data (edycji lub potwierdzenia), poziom wiarygodności, link do oryginału.
- **Uczciwość wobec braków**: stan „za mało danych”, ostrzeżenia o nieaktualności, widoczne sprzeczności, komunikat o niedostępności źródła. Brak informacji nigdy nie jest dostępnością. Model 3D wejścia jest przy każdym miejscu; gdy nie znamy liczby stopni, rysujemy w ich miejscu przezroczysty blok ze znakiem „?”, a nie wejście bez schodów.
- **Trasa z barierami, nie tylko linia na mapie**: widać, co trasa omija i czego nie wiemy (np. przejście bez danych o krawężnikach).
- **Dane rosną same**: OpenStreetMap jako baza, poprawki wracają do źródła („Popraw w OpenStreetMap”), właściciele i użytkownicy uzupełniają resztę. Miasto nie musi utrzymywać bazy.
- **Kanał B2B od pierwszego dnia**: widżet do osadzenia dla hoteli, organizatorów i właścicieli obiektów.

## Funkcje: gotowe i wymagające dalszych prac

| Obszar | Gotowe w prototypie | Do zrobienia |
|---|---|---|
| Potrzeby | 3 profile, 10 ustawień, zapis lokalny | profile dla osób niewidomych i głuchych, zapis między urządzeniami (opcjonalne konto) |
| Miejsca | OSM na żywo + kopia zapasowa; wejścia budynku (wybór najbardziej dostępnego), toalety, przewijaki, ławki i parkingi w pobliżu | dane wnętrz (piętra, windy), godziny działania wind, zdjęcia wejść |
| Wiarygodność | 4 poziomy + dane przykładowe, daty, nieaktualność > 3 lata, sprzeczności, potwierdzenia | ważenie zgłoszeń wg reputacji, automatyczne wygaszanie po zmianach w OSM |
| Trasy | routing po chodnikach OSM z kosztami wg potrzeb, lista barier i udogodnień, zwykła trasa z jej barierami i proponowana łatwiejsza, omijanie zgłoszonych przeszkód i niedziałających wind | komunikacja miejska (niskopodłogowe pojazdy, GTFS-RT), wyznaczanie po wnętrzach i przejściach podziemnych, nachylenie z modelu terenu |
| Zgłoszenia | potwierdzenie, poprawka, tymczasowe utrudnienie z wygasaniem, link do edycji w OSM | serwer z moderacją, notatki OSM, powiadomienia właściciela |
| Właściciele i partnerzy | widżet `?embed=`, link do udostępnienia, formularz deklaracji właściciela (niezweryfikowana do czasu weryfikacji uprawnień) | panel właściciela z weryfikacją uprawnień, API dla systemów rezerwacyjnych |
| Skalowanie | konfiguracja miasta w jednym pliku, raport pokrycia danych OSM („O danych”, `meta.json`) | adaptery danych miejskich, kolejne miasta |
| Dostępność cyfrowa | klawiatura, czytnik ekranu, kontrast AA, statusy kształtem, lista zamiast mapy, PL/EN, ustawienia dla wzroku (większy tekst i kontrast, czytanie na głos) | audyt z użytkownikami, mapa o wysokim kontraście, prowadzenie głosowe na żywo, testy z VoiceOver/TalkBack |
