# Źródła danych, aktualność i wiarygodność

## Zasada

Każda informacja o dostępności to **fakt** z czterema cechami:

| Cecha | Przykład | Gdzie w kodzie |
|---|---|---|
| wartość | `doorWidthCm: 90` | `app/src/core/types.ts` → `Fact` |
| źródło | OpenStreetMap, deklaracja właściciela, zgłoszenie | `app/src/core/sources.ts` |
| data | ostatnia edycja albo jawne potwierdzenie (`check_date`, `survey:date`, potwierdzenie użytkownika) | `Fact.date`, `Fact.confirmed` |
| link do oryginału | `https://www.openstreetmap.org/node/…` | `Fact.url` |

Jeden atrybut (np. szerokość drzwi) może mieć **kilka faktów z różnych źródeł**. Aplikacja wybiera najbardziej wiarygodny, a przy równej wiarygodności najnowszy. Pozostałe, jeśli się różnią, pokazuje jako „inne źródło podaje co innego”.

## Poziomy wiarygodności

| Poziom | Znaczenie | Przykład | Wygląd |
|---|---|---|---|
| **Zweryfikowane na miejscu** | sprawdzone przez audytora lub zaufanego partnera | audyt organizacji osób z niepełnosprawnościami | tarcza z ✓, ramka zielona |
| **Oficjalne** | podane przez właściciela miejsca lub instytucję publiczną | deklaracja właściciela, zbiór miejski | ikona budynku |
| **Społeczność** | naniesione przez wolontariuszy, bez formalnej weryfikacji | OpenStreetMap | ikona osób |
| **Zgłoszenie użytkownika (niezweryfikowane)** | podane przez jedną osobę | poprawka, tymczasowe utrudnienie | dymek, ramka przerywana |
| *Dane przykładowe* | wymyślone na potrzeby demonstracji | deklaracje i audyty w prototypie | etykieta w paski „DANE PRZYKŁADOWE” |

Wynik oceny pokazuje też, **na czym się opiera**: „Na podstawie: społeczność (bez formalnej weryfikacji)” oznacza, że najsłabsze źródło użyte w ocenie to OSM.

## Aktualność

- **Data przy każdym fakcie**: dla OSM to data `check_date` / `survey:date` (oznaczona jako *potwierdzone*) albo data ostatniej edycji elementu (*aktualizacja*).
- **Dane starsze niż 3 lata** są oznaczone „może być nieaktualne”, a karta miejsca pokazuje ostrzeżenie.
- **Tymczasowe utrudnienia** (zepsuta winda, zablokowany podjazd, roboty) **wygasają po 14 dniach**, chyba że ktoś potwierdzi „nadal aktualne”, co przedłuża je o kolejne 14 dni.
- **Potwierdzenia użytkowników** („Potwierdzam, że jest aktualne”) są pokazywane z liczbą i datą ostatniego potwierdzenia jako informacja niezweryfikowana.
- **Status źródła** jest zawsze widoczny w pasku nad listą: *dane na żywo z OpenStreetMap (liczba miejsc, godzina pobrania)*, *zapisana kopia z dnia…* albo *źródło niedostępne*.

## Braki i sprzeczności

| Sytuacja | Co widzi użytkownik |
|---|---|
| Brak danych o czymś, czego potrzebuje (np. szerokość drzwi przy profilu „wózek”) | wynik **„Za mało danych”**, pozycja „Brak danych o szerokości drzwi (potrzebujesz 80 cm)”, licznik brakujących informacji; w modelu 3D wejścia nieznane stopnie to przezroczysty blok ze znakiem „?”, a nieznane wymiary mają podpis „?” |
| Tylko ogólne oznaczenie OSM `wheelchair=yes` bez szczegółów | „Oznaczone jako dostępne dla wózków – bez szczegółowych pomiarów”; drzwi „niezmierzone” |
| Źródła się różnią (np. drzwi 120 cm vs 75 cm) | wybrany fakt + ramka „Inne źródło podaje co innego” z wartością, źródłem, datą i komentarzem; wynik nie może być „spełnia Twoje potrzeby”; licznik sprzeczności |
| Ogólne oznaczenie przeczy szczegółom (`wheelchair=yes`, a w danych 3 stopnie bez podjazdu) | „Źródła się różnią: wheelchair=yes vs. dane szczegółowe: 3 stopnie – sprawdź przed wyjściem” |
| Trasa: przejście bez danych o krawężnikach, nieznana nawierzchnia | pozycje „Przejście przez ulicę bez danych o krawężnikach”, „Nieznana nawierzchnia: 420 m (35% trasy)”; przy dużych brakach wynik „Za mało danych” |
| OpenStreetMap nie odpowiada | aplikacja pokazuje zapisaną kopię; w „O danych” źródło ma stan „Zapisana kopia” z datą i przyczyną, na telefonie nad mapą jest plakietka „OpenStreetMap nie odpowiada · kopia z 3 paź 2026, 02:17” + „Odśwież”, a przy trasie komunikat „korzystamy z zapisanej kopii chodników z …” |
| Źródło miejskie (warstwa przystanków ZTP) nie odpowiada w 8 s | przystanki z kopii nocnej; w „O danych” przy źródle „Zapisana kopia” z datą i przyczyną. Bez kopii przystanków po prostu nie ma na liście: nie pokazujemy ich z domyślną oceną |
| Przystanek ze zwykłym krawężnikiem peronu (rejestr nie podaje wysokości) przy profilu „wózek” | wynik **„Brak danych”** i pozycja „Peron z krawężnikiem peronowym; rejestr nie podaje jego wysokości”. Tylko krawężnik podwyższony (typu Kassel) daje „Dostępne” |
| Brak źródła i brak kopii | pasek „…Widzisz tylko dane przykładowe – to nie są prawdziwe informacje”; trasa nie jest rysowana („Nie pokazujemy trasy, której nie możemy sprawdzić”) |
| Podkład mapy niedostępny | mapa przechodzi na zwykłe tło, znaczniki i trasy dalej działają, a lista pozostaje pełną alternatywą |

Wszystkie powyższe przypadki da się pokazać na żywo. W „O danych” jest przełącznik **„Demonstracja: symuluj niedostępność OpenStreetMap”** (wyłącza też źródło miejskie), a dane przykładowe zawierają sprzeczność (Sukiennice: drzwi), dane stare (Collegium Maius, 2019) i dane niepełne (Fabryka Schindlera: tylko `wheelchair=yes`).

## Źródła

### Używane w prototypie

**OpenStreetMap (Overpass API)**: miejsca, wejścia, toalety, przewijaki, ławki, parkingi dla osób z niepełnosprawnościami, sieć chodników.

- *Pobieranie*: zapytanie Overpass QL dla obszaru miasta (`app/src/data/osm.ts` → `placesQuery`) przy starcie aplikacji; dla tras zapytanie o chodniki w obszarze trasy (`app/src/data/network.ts` → `networkQuery`).
- *Używane tagi*: `wheelchair`, `wheelchair:description`, `toilets:wheelchair`, `changing_table`, `entrance`, `step_count`, `ramp`, `ramp:wheelchair`, `ramp:stroller`, `door:width`, `width`, `automatic_door`, `handrail`, `building:levels`, `tactile_paving`, `highway=steps|footway|…`, `footway=crossing`, `kerb`, `kerb:height`, `barrier`, `surface`, `smoothness`, `incline`, `sidewalk`, `highway=elevator`, `amenity=bench|toilets|parking_space`, `check_date`, `survey:date`.
- *Częstotliwość*: na żywo przy każdym uruchomieniu (dane OSM aktualizują się w Overpass co minutę) oraz kopia zapasowa co noc (GitHub Actions, `.github/workflows/refresh-data.yml`).
- *Gdy niedostępne*: kolejne serwery Overpass (3 publiczne instancje), potem kopia w przeglądarce (Cache Storage), potem kopia nocna (`app/public/data/krakow/places.json`, `network.json`), a na końcu jasny komunikat. Zapisana kopia miejsc pojawia się od razu po otwarciu aplikacji (z datą), a dane na żywo ją podmieniają, gdy przyjdą. Trasa czeka na serwery Overpass najwyżej 8 s, jeśli kopia nocna obejmuje jej obszar; sama kopia sieci (ok. 4 MB, 0,6 MB po kompresji) jest pobierana dopiero wtedy, gdy serwery nie odpowiedzą. Nieudane pobranie w potoku nie usuwa poprzedniej kopii. `meta.json` zapisuje błąd i datę ostatniego sukcesu.
- *Warunki*: licencja ODbL 1.0, wymagane oznaczenie „© autorzy OpenStreetMap”, widoczne w stopce. Publiczne instancje Overpass mają limity użycia; w usłudze produkcyjnej planujemy własną instancję lub komercyjnego dostawcę.

**Przystanki Komunikacji Miejskiej w Krakowie** — dane miejskie: rejestr przystanków prowadzony przez Zarząd Transportu Publicznego w Krakowie, zbiór „Komunikacja Miejska w Krakowie (KMK)” w portalu Otwarte Dane Miasta Krakowa (`otwartedane.um.krakow.pl/zbiory-danych/komunikacja-miejska-w-krakowie-kmk`).

- *Pobieranie*: publiczna usługa ArcGIS `Przystanki_Komunikacji_Miejskiej_w_Krakowie/FeatureServer/0`, zapytanie `query` z obszarem aplikacji, wynik w GeoJSON, bez klucza (`app/src/data/ztp.ts` → `stopsUrl`, `placesFromZtp`). Karta do osadzenia pobiera pojedynczy przystanek po kodzie (`stopUrl`).
- *Co z tego powstaje*: każdy czynny słupek przystankowy (typ A, T lub TA, grupa KMK) to miejsce z kategorią „Przystanek”: w obszarze aplikacji 156. Pola rejestru zamieniamy na fakty: `Krawężnik_peronowy` → krawężnik peronu (podwyższony typu Kassel / zwykły / brak), `Nawierzchnia_peronu` → nawierzchnia, `Wiata_liczba` → wiata, `Ławki_poza_wiatą`, `Ławki_inne_poza_wiatą`, `Inne_do_siedzenia` → miejsca odpoczynku (z liczbą ławek i barierosiedzisk). Przystanków planowanych, tymczasowych, zawieszonych i po dacie `validUntil` nie pokazujemy.
- *Źródło, data, wiarygodność*: źródło „ZTP Kraków – Otwarte Dane Miasta Krakowa”, poziom **oficjalne**, data = `EditDate` rekordu (ostatnia zmiana w rejestrze), link do zbioru w portalu.
- *Niczego nie zgadujemy*: puste albo nieznane pole nie daje faktu. Rejestr liczy ławki poza wiatą, więc przy przystanku z wiatą i bez innych ławek nie twierdzimy ani „jest gdzie usiąść”, ani „nie ma”. Przystanek ocenia się po peronie, a nie po wejściu, drzwiach i toalecie.
- *Częstotliwość*: wydawca podaje aktualizację codzienną; aplikacja pyta na żywo przy starcie, a potok zapisuje kopię co noc (`app/public/data/krakow/stops.json`, wpis `ztp-stops` w `meta.json`).
- *Gdy niedostępne*: po 8 s bez odpowiedzi albo przy błędzie aplikacja bierze kopię nocną i pokazuje w „O danych” stan „Zapisana kopia” z datą. Nieudane pobranie w potoku nie usuwa poprzedniej kopii.
- *Warunki*: „Warunki wykorzystania Danych udostępnianych w Portalu”: bezpłatnie, z podaniem źródła („Gmina Miejska Kraków, otwartedane.um.krakow.pl”) oraz czasu wytworzenia i pozyskania danych; oba są przy każdym fakcie i w „O danych”.

**OpenStreetMap API (`api.openstreetmap.org`)**: pojedynczy element dla karty osadzonej na stronie partnera (`app/src/data/singlePlace.ts`). Szybkie, zawiera wejścia budynku.

**OpenFreeMap**: podkład mapy (kafelki wektorowe z danych OSM/OpenMapTiles), bez klucza. Gdy jest niedostępny, aplikacja działa na zwykłym tle.

**Ortofotomapa GUGiK (Geoportal.gov.pl)**: zdjęcie lotnicze całej Polski, otwarte dane publiczne bez klucza, oznaczenie „Ortofotomapa © GUGiK” w stopce mapy. Pokazujemy je zamiast rysowanej mapy; gdy serwis nie odpowiada, mapa sama wraca do OpenFreeMap.

**Zgłoszenia użytkowników**: w prototypie zapisywane w przeglądarce (localStorage). Wyraźnie oznaczone jako niezweryfikowane i oddzielone od danych potwierdzonych.

### Planowane (kolejne źródła wskazane w wyzwaniu)

| Źródło | Co chcemy pobrać | Sposób | Częstotliwość | Status |
|---|---|---|---|---|
| **Parkingi Park and Ride w Krakowie** (ZTP, ten sam zbiór co przystanki) | położenie parkingów P+R jako punktów przesiadki | usługa ArcGIS `Park_and_Ride/FeatureServer`, GeoJSON | wydawca: codziennie; pobieramy co noc | sprawdzone 4.10.2026; do podłączenia |
| **Listy obiektów miejskich** (Otwarte Dane Miasta Krakowa): „Lista muzeów miejskich w Krakowie”, „Lista teatrów miejskich w Krakowie”, „Lista bibliotek miejskich (filii) Biblioteki Kraków”, „Podmioty lecznicze prowadzone przez Gminę Miejską Kraków”, „Centra Aktywności Seniora w Krakowie”, „Kluby Rodziców z dziećmi do lat 3 w Krakowie”, „Parki miejskie w Krakowie”, „Parki kieszonkowe w Krakowie” | które miejsca prowadzi Miasto i kto za nie odpowiada; same listy nie zawierają informacji o dostępności | pliki JSON/CSV/XLSX albo API portalu (`api.um.krakow.pl`); dopasowanie do miejsc z OSM po nazwie i adresie | wg wydawcy (muzea: rocznie, Centra Aktywności Seniora: co pół roku, parki: kwartalnie); sprawdzamy co noc | sprawdzone 4.10.2026; do podłączenia |
| **MSIP** (msip.krakow.pl) | warstwy przestrzenne (np. przejścia, chodniki, parkingi), jeśli licencja pozwala | WFS (GeoJSON) | co tydzień | do weryfikacji zakresu i warunków |
| **dane.gov.pl** | zbiory uzupełniające i dla kolejnych miast (np. dane przewoźników, obiekty publiczne) | API (JSON:API) | wg zbioru | planowane |
| **GTFS komunikacji miejskiej** (ZTP, `gtfs.ztp.krakow.pl`) | rozkłady i przystanki (`GTFS_KRK_A.zip` autobusy, `GTFS_KRK_T.zip` tramwaje, `GTFS_KRK_M.zip`), utrudnienia i położenie pojazdów na żywo (`ServiceAlerts_*.pb`, `VehiclePositions_*.pb`); informacja o dostępności pojazdu, jeśli wydawca ją podaje (`wheelchair_accessible`) | GTFS / GTFS-RT, bez klucza | rozkłady codziennie, dane na żywo na bieżąco | sprawdzone 4.10.2026: pliki dostępne; planowane |
| **Deklaracje dostępności instytucji publicznych** | informacje o dostępności architektonicznej publikowane przez podmioty publiczne | ręczne mapowanie lub formularz dla instytucji, zawsze z linkiem do źródła | przy zmianie | planowane, *oficjalne* |
| **Deklaracje właścicieli** (formularz w aplikacji) | szczegóły wejść, toalet, wind | formularz „Jestem właścicielem…” w karcie miejsca; w usłudze panel z weryfikacją uprawnień | na bieżąco | w prototypie: formularz (status *niezweryfikowane* do czasu weryfikacji) + dane przykładowe |
| **Audyty partnerów** | pomiary na miejscu | import od partnera audytowego | przy audycie | w prototypie dane przykładowe |

**Dane miejskie: co sprawdziliśmy (stan na 4 października 2026 r.).** Portal Otwarte Dane Miasta Krakowa udostępnia 45 zbiorów. Żaden z nich nie opisuje wprost dostępności architektonicznej, toalet publicznych ani miejsc postojowych dla osób z niepełnosprawnościami, dlatego te informacje bierzemy dziś z OpenStreetMap. Najbliżej naszego tematu jest warstwa przystanków ZTP: ma osobne pola dla krawężnika peronu, nawierzchni peronu, wiat, ławek i barierosiedzisk, czyli dokładnie to, o co pyta osoba na wózku albo ktoś, kto musi po drodze usiąść. Tę warstwę podłączyliśmy do aplikacji (opis wyżej, w „Używane w prototypie”). Rejestr nie podaje wysokości zwykłego krawężnika, więc tego jednego nie wiemy i mówimy to wprost. Listy obiektów miejskich posłużą do czegoś innego: wiemy dzięki nim, które miejsca prowadzi Miasto, więc możemy je oznaczyć i poprosić właściwą jednostkę o deklarację dostępności w aplikacji.

**Warunki ponownego wykorzystania** (dokument portalu „Warunki wykorzystania Danych udostępnianych w Portalu”): dane można wykorzystywać bezpłatnie, pod warunkiem podania źródła („Gmina Miejska Kraków, otwartedane.um.krakow.pl”) oraz czasu wytworzenia i pozyskania danych. Oba wymagania spełnia nasz model: każdy fakt ma źródło, datę danych i datę pobrania. Portal nie podaje nazwanej licencji (np. CC BY), więc przed pilotażem potwierdzamy warunki z wydawcą, a dla warstw ZTP w serwisie ArcGIS — osobno z ZTP.

**MSIP** udostępnia katalog danych z zakładką „Otwarte dane” (eksport do plików `*.shp`, `*.dxf`, `*.json`) oraz usługi mapowe WMS/WFS serwera `msip.um.krakow.pl/arcgis/services`. Warstw MSIP jeszcze nie wybraliśmy: szukamy tam przede wszystkim chodników, przejść i miejsc postojowych dla osób z niepełnosprawnościami. Każde podłączone źródło zapisujemy w konfiguracji miasta (`datasets`) z adresem, formatem, warunkami i częstotliwością odświeżania, tak aby było to widać w „O danych”.

**Gdy źródło miejskie jest niedostępne**, działa ten sam mechanizm co dla OpenStreetMap (dla przystanków ZTP już wdrożony): adapter uruchamiany co noc zostawia ostatnią udaną kopię, w `meta.json` zapisuje błąd i datę ostatniego sukcesu, a aplikacja pokazuje dane z tej kopii razem z jej datą. Nieudane pobranie nigdy nie usuwa wcześniejszych danych i nigdy nie zamienia „brak danych” na „dostępne”.

Dla każdego nowego źródła sprawdzamy licencję i warunki ponownego wykorzystania. Samo opublikowanie informacji w internecie nie oznacza zgody na jej automatyczne pobieranie, zwłaszcza w celach komercyjnych. Nie pobieramy automatycznie treści ze stron bez wyraźnej licencji. W takim przypadku pytamy właściciela danych lub prosimy go o deklarację w aplikacji.

## Pokrycie danych

W „O danych” aplikacja pokazuje, jaki odsetek miejsc z OpenStreetMap w obszarze ma daną informację: jakąkolwiek informację o dostępności, liczbę stopni, szerokość drzwi, toaletę, przewijak oraz dane edytowane lub potwierdzone w ostatnich 3 latach. To samo trafia do `meta.json` przy każdym nocnym odświeżeniu. Raport pokazuje, gdzie potrzebne są deklaracje właścicieli i mapathony, i jest pierwszym krokiem przed uruchomieniem kolejnego miasta.

## Poprawianie błędnych i nieaktualnych danych

1. **Użytkownik** w karcie miejsca: „Potwierdzam, że jest aktualne”, „Zgłoś zmianę lub błąd” (wybiera atrybut i prawidłową wartość) albo „Zgłoś tymczasowe utrudnienie”. Zgłoszenie od razu pojawia się obok danych jako *niezweryfikowane*.
2. **Dane z OpenStreetMap** najlepiej poprawić u źródła: przycisk „Popraw w OpenStreetMap” otwiera edycję elementu. Poprawka trafia do aplikacji przy najbliższym odświeżeniu i służy wszystkim, nie tylko nam.
3. **W usłudze** zgłoszenia trafiają do moderacji (patrz `docs/bezpieczenstwo.md`). Potwierdzone przez kilka osób lub przez właściciela zmieniają status, a poprawki danych OSM mogą być przekazywane jako notatki OSM dla lokalnych maperów.
4. **Właściciel** wypełnia deklarację („Jestem właścicielem lub zarządcą…”). W prototypie ma ona status *niezweryfikowane* (jak zgłoszenie). W usłudze, po weryfikacji uprawnień, staje się *oficjalna*, a audytor partnera podnosi wiarygodność do *zweryfikowane*.

## Dane przykładowe

Dane przykładowe w `app/src/data/sample.ts` pokazują, jak wyglądają źródła, których w prototypie jeszcze nie mamy (deklaracje właścicieli, audyty, zgłoszenia). **Są wymyślone i nie opisują rzeczywistego stanu miejsc.** Każdy fakt ma etykietę „Dane przykładowe”. Gdy miejsce z danymi przykładowymi istnieje w OSM, fakty przykładowe są dołączane do prawdziwego miejsca obok danych OSM, aby pokazać kilka źródeł naraz.
