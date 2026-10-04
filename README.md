# Feel Free

**Sprawdź miejsce lub trasę pod kątem swoich potrzeb, a przy każdej informacji zobacz jej źródło, datę i wiarygodność.**

Prototyp na HackYeah 2026, wyzwanie „Kraków bez barier”. Grupa docelowa prototypu to **osoby poruszające się na wózku i rodzice z wózkami dziecięcymi**. Ten sam model danych obsługuje też osoby z trudnościami w chodzeniu.

**Demonstracja:** https://feelfree.team · **Film (1 min):** [docs/prezentacja/feelfree-mobile.mp4](docs/prezentacja/feelfree-mobile.mp4) · **Prezentacja:** [PDF, 10 slajdów](docs/prezentacja/prezentacja.pdf)

## Problem

Oznaczenie „dostępne / niedostępne” nie mówi, czy *ja* wejdę i przejadę. Dla jednej osoby problemem są dwa stopnie, dla innej wąskie drzwi albo kilometr kocich łbów bez ławki. Informacje o dostępności są rozproszone. Często nie wiadomo, skąd pochodzą i czy są aktualne. Brak danych bywa mylony z dostępnością.

## Rozwiązanie

1. **Potrzeby zamiast diagnozy.** Użytkownik wybiera profil (wózek inwalidzki, wózek dziecięcy, trudności w chodzeniu) i może dopracować szczegóły: ile stopni pokona, jaki krawężnik, jak szerokie drzwi, jaki podjazd, czy potrzebuje toalety, przewijaka, windy lub miejsc odpoczynku. Nie pytamy o zdrowie ani niepełnosprawność. Ustawienia zostają w przeglądarce.
2. **Miejsce: konkretne fakty, nie jeden znaczek.** Karta miejsca pokazuje stopnie, podjazd i jego nachylenie, podnośnik, próg, szerokość drzwi, windę, toaletę, przewijak, miejsca odpoczynku i nawierzchnię. Przy każdym fakcie widać **źródło, datę i poziom wiarygodności**. Wynik ma cztery stany: *spełnia Twoje potrzeby*, *z utrudnieniami*, *bariera dla Ciebie*, *za mało danych*. **Brak danych nigdy nie jest pokazywany jako dostępność.**
3. **Trasa dopasowana do potrzeb.** Wyznaczamy trasę po sieci chodników OpenStreetMap: omija schody, wysokie krawężniki, bruk i strome odcinki. Pokazujemy każdą barierę i udogodnienie po drodze (krawężniki, przejścia bez danych, ławki, toalety, zgłoszenia), także przy najkrótszej trasie, którą omijamy.
4. **Dane bez ręcznego utrzymywania przez Miasto.** OpenStreetMap i otwarte dane miasta (rejestr przystanków ZTP) działają na żywo, a co noc zapisujemy kopię zapasową. Do tego deklaracje właścicieli, audyty i zgłoszenia użytkowników. Gdy źródła się różnią, widać obie wersje. Dane starsze niż 3 lata są oznaczone. Gdy źródło nie odpowiada, aplikacja mówi to wprost i pokazuje kopię z datą.
5. **Gotowe do wdrożenia u innych.** Kartę dostępności dowolnego miejsca można osadzić na stronie hotelu, organizatora wydarzenia czy właściciela obiektu jedną linią HTML. Kolejne miasto to jeden plik konfiguracji.
6. **Znajomy układ, jak w aplikacjach map.** Mapa 3D (budynki, rzeźba terenu, widok 2D na życzenie), wyszukiwarka i filtry potrzeb nad mapą. Karta miejsca ma zdjęcia, ocenę z powodem, przyciski (trasa, zdjęcie, opinia, udostępnij) i zakładki: przegląd, zdjęcia, opinie, informacje. Na telefonie panel wysuwa się od dołu, na komputerze jest z boku.
7. **Zdjęcia i opinie od ludzi, sprawdzane przed publikacją.** Zdjęcia z Wikimedia Commons (z autorem i licencją) i od użytkowników. Opinia zaczyna się od pytania „Czy było dostępne?”. Każde zdjęcie i każdą opinię przed publikacją sprawdza AI (Claude): bez twarzy, tablic rejestracyjnych, danych osobowych i treści niezwiązanych z miejscem. To, co AI odczyta ze zdjęcia (np. liczbę stopni), pokazujemy osobno jako niezweryfikowane i nie zmienia to oceny.

## Co działa w prototypie

| Funkcja | Stan |
|---|---|
| Profile potrzeb (3 gotowe + własne ustawienia), zapis tylko lokalnie | ✅ |
| Miejsca z OpenStreetMap na żywo (wejścia, toalety, przewijaki, ławki i parkingi w pobliżu) | ✅ |
| Źródło, data, wiarygodność i link do oryginału przy każdym fakcie | ✅ |
| Sprzeczne źródła, dane nieaktualne, brak danych, niedostępność źródła (z kopią zapasową) | ✅ |
| Sprawdzanie trasy: najpierw zwykła (najkrótsza) trasa z jej barierami, potem łatwiejsza trasa dla wybranych potrzeb, z listą barier i udogodnień | ✅ |
| Zgłoszenia: potwierdzenie, poprawka, tymczasowe utrudnienie (wygasa po 14 dniach) | ✅ (lokalnie w przeglądarce) |
| Karta do osadzenia na stronach partnerów (`?embed=`) | ✅ |
| Deklaracja właściciela w karcie miejsca (do czasu weryfikacji uprawnień oznaczona jako niezweryfikowana) | ✅ (lokalnie w przeglądarce) |
| Raport pokrycia danych OSM („O danych”, `meta.json` w potoku) | ✅ |
| Mapa 3D: budynki, rzeźba terenu z cieniowaniem, niebo; przełącznik 2D, kompas, „moja lokalizacja” | ✅ |
| Zdjęcie lotnicze Krakowa (ortofotomapa GUGiK) pod budynkami 3D, przełącznik na rysowaną mapę | ✅ |
| Szczegóły na mapie: pinezki z ikoną rodzaju miejsca i znakiem oceny, schody z OpenStreetMap, ławki, miejsca parkingowe dla osób z niepełnosprawnościami, windy | ✅ |
| Zdjęcia miejsc z Wikimedia Commons (autor, licencja) i od użytkowników, przeglądarka zdjęć | ✅ |
| Opinie z odpowiedzią „Czy było dostępne?” | ✅ |
| Moderacja zdjęć i opinii przez AI przed publikacją (serwer `app/api`, Vercel + Upstash Redis) | ✅ (wymaga klucza API) |
| Wersja na telefon (panel od dołu) i na komputer (panel boczny), szkło na mapie | ✅ |
| Interfejs PL/EN, klawiatura, czytnik ekranu, kontrast AA, lista zamiast mapy | ✅ (szczegóły w `docs/dostepnosc.md`) |
| Ustawienia dla wzroku: większy tekst i wysoki kontrast, czytanie miejsc i tras na głos | ✅ (pierwsza wersja; prowadzenie głosowe na żywo w planie) |
| Potok danych `npm run data:fetch` + nocne odświeżanie w GitHub Actions | ✅ |
| Dane miejskie: przystanki ZTP z portalu Otwarte Dane Miasta Krakowa (krawężnik i nawierzchnia peronu, wiaty, ławki), poziom „oficjalne”, na żywo + kopia nocna | ✅ |

**W planie:** zgłoszenia barier i deklaracje właścicieli na serwerze, konta właścicieli z weryfikacją; kolejne zbiory miejskie: parkingi P+R, GTFS, listy obiektów miejskich, MSIP (opis w `docs/dane.md`).

**Dane przykładowe** (deklaracje właścicieli, audyty, zgłoszenia) są wymyślone, aby pokazać, jak wyglądają różne źródła obok siebie. Każdy taki fakt ma etykietę „Dane przykładowe”, a w „O danych” można je wyłączyć.

## Dokumentacja

- [Opis rozwiązania, grupa docelowa, scenariusze](docs/rozwiazanie.md)
- [Źródła danych, aktualność i wiarygodność](docs/dane.md)
- [Architektura, przepływ danych, dodawanie źródeł i miast](docs/architektura.md)
- [Dostępność cyfrowa: co sprawdziliśmy, ograniczenia, plan](docs/dostepnosc.md)
- [Prywatność i bezpieczeństwo](docs/bezpieczenstwo.md)
- [Model biznesowy, utrzymanie, rozwój](docs/biznes.md)
- [Scenariusz demonstracji i filmu](docs/demo.md)
- [Prezentacja (PDF, 10 slajdów)](docs/prezentacja/prezentacja.pdf)
- [Film: działanie aplikacji na telefonie (mp4, 1 min)](docs/prezentacja/feelfree-mobile.mp4)
- [Zgłoszenie: opis projektu i wymagania wyzwania punkt po punkcie](docs/zgloszenie.md)

## Uruchomienie

```sh
cd app
npm install
npm run dev          # http://localhost:5173
npm test             # testy logiki (ocena miejsc, trasy, adapter OSM)
npm run lint
npm run build        # statyczna strona w app/dist
npm run data:fetch   # zapisuje kopię zapasową danych w app/public/data/krakow
```

Opinie i zdjęcia (opcjonalny serwer w `app/api`):

```sh
cd app
cp .env.example .env.local   # ANTHROPIC_API_KEY do moderacji; opcjonalnie Upstash Redis
npm run dev                  # razem z /api; lokalnie dane w app/.data/community.json
```

Bez klucza `ANTHROPIC_API_KEY` nic nowego nie jest publikowane: opinie i zdjęcia czekają na moderację i widzi je tylko autor. Na hostingu bez `/api` (np. GitHub Pages) zapisują się tylko w przeglądarce.

Wdrożenie: Vercel z *Root Directory* `app`. Funkcje z `app/api` uruchamiają się same; ustaw zmienne `ANTHROPIC_API_KEY` oraz `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN` (albo podłącz Upstash z Marketplace, wtedy `KV_REST_API_URL` i `KV_REST_API_TOKEN`). Sama strona działa też na dowolnym hostingu statycznym (Netlify, Cloudflare Pages, GitHub Pages).

## Licencje

Kod: do ustalenia przez zespół (proponowana MIT). Dane mapy: © autorzy OpenStreetMap, licencja ODbL 1.0. Podkład mapy: OpenFreeMap (OpenMapTiles, dane OSM). Zdjęcie lotnicze: Ortofotomapa © GUGiK (Geoportal.gov.pl). Rzeźba terenu: Terrain Tiles (AWS Open Data, Mapzen). Zdjęcia z Wikimedia Commons: licencje podane przy każdym zdjęciu. Komponenty: React, MapLibre GL JS (BSD-3), three.js (MIT), Lucide (ISC), Anthropic SDK (MIT), Zod (MIT). Pełna lista w `docs/architektura.md`.

---

## Podsumowanie

**Feel Free** pozwala mieszkańcom i turystom sprawdzić miejsce albo trasę pod kątem *własnych* potrzeb: ile stopni pokonają, jaki krawężnik, jak szerokie drzwi, jak stromy podjazd, czy potrzebują toalety, przewijaka, windy, miejsc do odpoczynku. Nigdy nie pytamy o zdrowie ani o niepełnosprawność. Każda informacja ma **źródło, datę i poziom wiarygodności**. Sprzeczne źródła pokazujemy obok siebie, stare dane są oznaczone, a brak danych nigdy nie jest przedstawiany jako dostępność.

Miejsca pochodzą na żywo z OpenStreetMap, a kopia nocna jest zabezpieczeniem. Trasy liczymy po sieci chodników OSM: omijają schody, wysokie krawężniki, bruk i strome odcinki, a po drodze wymieniają każdą barierę i każde udogodnienie. Najpierw pokazujemy zwykłą, najkrótszą trasę z jej barierami, potem łatwiejszą dla wybranych potrzeb. Karta do osadzenia jedną linią kodu pozwala hotelom, organizatorom wydarzeń i właścicielom obiektów pokazać informacje o dostępności na własnych stronach. Interfejs przypomina aplikacje z mapami: mapa 3D, wyszukiwarka i filtry potrzeb u góry, karta miejsca ze zdjęciami (Wikimedia Commons z autorem i licencją oraz zdjęcia użytkowników), opinie zaczynające się od pytania „Czy było dostępne?”, panel od dołu na telefonie i boczny na komputerze. Każde zdjęcie i każdą opinię użytkownika sprawdza przed publikacją AI (Claude); bez klucza API nic nowego się nie publikuje. Dodanie kolejnego miasta to jeden plik konfiguracji. Interfejs jest po polsku i po angielsku i jest projektowany pod WCAG 2.2 AA: klawiatura, czytniki ekranu, kontrast i tekstowa alternatywa dla wszystkiego, co jest na mapie.
