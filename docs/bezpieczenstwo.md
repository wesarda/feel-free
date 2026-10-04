# Prywatność i bezpieczeństwo

## Jakie dane zbieramy

| Dane | Prototyp | Usługa docelowa |
|---|---|---|
| Potrzeby użytkownika (stopnie, szerokość drzwi, toaleta…) | **tylko w przeglądarce** (localStorage), nigdy nie wysyłane | bez zmian; opcjonalnie synchronizacja między urządzeniami po zalogowaniu, szyfrowana |
| Informacja o niepełnosprawności lub zdrowiu | **nie zbieramy**; profile opisują sposób poruszania się i bariery, nie diagnozę | nie zbieramy |
| Lokalizacja | tylko na żądanie („Moja lokalizacja”), używana lokalnie do wyznaczenia trasy | bez zmian; nie zapisujemy historii tras |
| Zgłoszenia (typ problemu, pozycja, komentarz) | w przeglądarce | na serwerze, **anonimowo**: bez konta, bez imienia; komentarz do 500 znaków z ostrzeżeniem, by nie podawać danych osobowych |
| Opinie (tekst do 1000 znaków, opcjonalny podpis, „czy było dostępne”) | na serwerze (`app/api`), bez konta; bez serwera tylko w przeglądarce | bez zmian |
| Zdjęcia | zmniejszone w przeglądarce i zapisane ponownie jako JPEG, więc **bez EXIF i współrzędnych GPS**; na serwerze dopiero po moderacji | bez zmian |
| Adres IP | tylko skrót SHA-256 z solą i datą, do limitu wpisów na godzinę; doba później nie da się go powiązać | bez zmian |
| Konta | brak | tylko dla właścicieli obiektów i partnerów (e-mail + weryfikacja uprawnień do obiektu) |
| Analityka | brak | statystyki bez ciasteczek śledzących i bez profilowania (np. zliczanie odsłon po stronie serwera) |

Nie potrzebujemy wiedzy o niepełnosprawności, bo do dopasowania wyników wystarczą preferencje dotyczące barier i udogodnień. To podejście wprost odpowiada wymaganiu wyzwania i zasadzie minimalizacji danych (RODO art. 5 ust. 1 lit. c). Dane o zdrowiu to szczególna kategoria (art. 9 RODO), więc ich niezbieranie usuwa całą klasę ryzyk.

## Ochrona zgłoszeń (usługa docelowa)

- **Moderacja**: nowe zgłoszenie jest od razu widoczne jako *niezweryfikowane*, ale komentarz z treścią przechodzi automatyczny filtr (wulgaryzmy, numery telefonów, adresy e-mail) i ręczną moderację przy zgłoszeniu nadużycia.
- **Ochrona przed nadużyciami**: limit zgłoszeń na adres IP i urządzenie (rate limiting), CAPTCHA przyjazna dostępności (np. proof-of-work zamiast obrazków) tylko przy podejrzanym ruchu, przechowywanie tylko skrótu adresu IP przez 30 dni.
- **Wygasanie**: tymczasowe utrudnienia wygasają po 14 dniach, a zgłoszenia są usuwane lub anonimizowane po rozpatrzeniu.
- **Wpływ na dane**: pojedyncze zgłoszenie nigdy nie nadpisuje danych potwierdzonych, tylko pojawia się obok nich. Zmiana statusu wymaga potwierdzeń kilku osób, właściciela albo audytora.
- **Konta właścicieli**: weryfikacja uprawnień do obiektu (np. e-mail w domenie firmy, dokument), dwuskładnikowe logowanie, dziennik zmian każdej deklaracji (kto, kiedy, co).

## Moderacja opinii i zdjęć (działa w prototypie)

- **Nic nie jest publiczne bez sprawdzenia.** Nowa opinia lub zdjęcie przechodzi proste reguły (linki, e-maile, numery telefonów), a potem moderację AI (Claude). Bez klucza API albo przy błędzie usługi treść czeka w kolejce i widzi ją tylko autor.
- **Zdjęcia**: odrzucamy rozpoznawalne twarze, czytelne tablice rejestracyjne, treści szkodliwe i zdjęcia niezwiązane z miejscem. Decyzję o twarzach i tablicach egzekwuje kod na podstawie odpowiedzi modelu, a nie tylko polecenie dla modelu.
- **Treść użytkownika to dane, nie polecenia.** Tekst opinii, podpis i tekst widoczny na zdjęciu trafiają do modelu w znacznikach, z poleceniem, by ich nie wykonywać. Odpowiedź modelu musi pasować do stałego schematu, inaczej treść nie jest publikowana.
- **Limity**: 10 opinii i 6 zdjęć na godzinę z jednego (zaszyfrowanego skrótem) adresu, zdjęcie do 2,5 MB, tylko JPEG.
- **Klucz API** jest tylko na serwerze (zmienne środowiskowe Vercel), nigdy w przeglądarce.

## Bezpieczeństwo techniczne

- **Wyłącznie HTTPS** (HSTS) dla aplikacji i wszystkich źródeł danych. Aplikacja łączy się tylko z jawnie wymienionymi usługami: Overpass, OSM API, otwarta warstwa przystanków ZTP (ArcGIS, services-eu1.arcgis.com), OpenFreeMap, Geoportal.gov.pl (ortofotomapa GUGiK), Terrain Tiles (AWS), Wikimedia Commons i Wikidata oraz własne `/api`.
- **Mała powierzchnia ataku**: strona jest statyczna, a `/api` ma cztery proste funkcje bez kont i logowania. Planowany nagłówek Content-Security-Policy ogranicza skrypty do własnej domeny, a połączenia do listy źródeł.
- **Adresy z OSM** (strona www, telefon) przechodzą przez filtr: link tylko `http(s)`, inne schematy są odrzucane.
- **Dane z zewnątrz traktujemy jako niezaufane**: treści z OSM i zgłoszeń są wstawiane jako tekst (React escapuje HTML), a dymki na mapie budowane przez `textContent`, nigdy `innerHTML`.
- **Karta do osadzenia** działa w `iframe` z własnej domeny, nie ma dostępu do strony partnera i nie ustawia ciasteczek.
- **Zależności**: niewielka liczba bibliotek, aktualizacje przez Dependabot/Renovate i `npm audit` w CI.
- **Kopie danych**: dane otwarte są w repozytorium (kopia nocna), a zgłoszenia i deklaracje w bazie z codziennym backupem w UE.

## Odpowiedzialność

Proponowany operator usługi (patrz `docs/biznes.md`) jest administratorem danych zgłoszeń i kont właścicieli. Prowadzi rejestr czynności przetwarzania, politykę prywatności i obsługę żądań RODO. Hosting jest w UE, a Miasto nie przetwarza danych użytkowników i nie udostępnia systemów wewnętrznych.
