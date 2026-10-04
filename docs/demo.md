# Scenariusz demonstracji (na żywo) i filmu (do 3 minut)

## Przygotowanie

- [ ] Na komputerze z internetem: `cd app && npm run data:fetch`, potem commit `app/public/data/krakow/`. To kopia zapasowa na wypadek słabego Wi-Fi na sali.
- [ ] Otwórz aplikację **przed** prezentacją (kopia trafi też do pamięci przeglądarki).
- [ ] W „O danych” zostaw włączone dane przykładowe i wyłączoną symulację awarii.
- [ ] Wyczyść ustawienia potrzeb (localStorage), żeby zacząć od wyboru profilu.

## Demonstracja na żywo (wymagania punktu 6 wyzwania)

Dane OpenStreetMap są prawdziwe i się zmieniają, więc wyniki dla konkretnych miejsc mogą odbiegać od opisu poniżej. Przypadki „sprzeczne / nieaktualne / niepełne” są zawsze w danych przykładowych (Sukiennice, Collegium Maius, Fabryka Schindlera), które aplikacja dołącza do prawdziwych miejsc.

| # | Krok | Co mówimy / co widać | Wymaganie |
|---|---|---|---|
| 1 | Wybierz **„Wózek inwalidzki”**, rozwiń „Dostosuj szczegóły” | Potrzeby to bariery, nie diagnoza: 0 stopni, krawężnik do 3 cm, drzwi ≥ 80 cm, podjazd ≤ 8%, toaleta. Zapis tylko w przeglądarce. | określenie potrzeb grupy, prywatność |
| 2 | Lista miejsc | Każde miejsce ma wynik i aspekty (wejście, drzwi, toaleta…). Kolor zawsze idzie w parze z kształtem i tekstem. | prezentacja |
| 3 | Otwórz **Sukiennice** | Wynik „Z utrudnieniami”. Fakty: 2 stopnie + podjazd 6% ✓, kostka brukowa ⚠. Przy każdym fakcie źródło, data i poziom. | konkretne bariery i udogodnienia |
| 4 | Wskaż **drzwi 120 cm vs 75 cm** | „Inne źródło podaje co innego”: zgłoszenie użytkownika z komentarzem. Sprzeczność nie daje wyniku „spełnia”. | **dane sprzeczne** |
| 5 | Otwórz **Collegium Maius** | Dane z 2019: etykieta „może być nieaktualne” i ostrzeżenie w karcie. | dane nieaktualne |
| 6 | Otwórz **Fabrykę Schindlera** | Tylko „wheelchair=yes” bez szczegółów, brak danych o toalecie, wynik „Za mało danych”. **Brak danych ≠ dostępność.** | **dane niepełne** |
| 7 | Kliknij „Potwierdzam, że jest aktualne” / „Zgłoś zmianę” / „Popraw w OpenStreetMap” | Jak poprawiamy dane: od razu jako niezweryfikowane, a w OSM u źródła. | poprawianie danych |
| 7a | Wyszukaj **„Przystanek Teatr Bagatela”** i otwórz „01”, potem „Przystanek Rondo Grzegórzeckie 01” | Dane miejskie: źródło „ZTP Kraków – Otwarte Dane Miasta Krakowa”, poziom **oficjalne**, data zmiany w rejestrze. Bagatela: krawężnik podwyższony (Kassel) → „Dostępne”. Rondo Grzegórzeckie: zwykły krawężnik bez podanej wysokości → „Brak danych”, a nie „Dostępne”. | dane miejskie, poziom wiarygodności |
| 8 | Zakładka **Trasa** → „Kraków Główny → Sukiennice” | Wynik trasy, długość i czas w tempie użytkownika, stopnie, krawężniki (znane i bez danych), bruk, ławki, toalety. Lista „Po drodze”; „Źródło” pod pozycją rozwija źródło, datę i wiarygodność. | sprawdzenie trasy |
| 9 | Pokaż krok „1. Zwykła trasa” (linia w czerwono-żółte paski na mapie) i krok „2. Łatwiejsza trasa dla Ciebie” (linia zielona) | Zwykła, najkrótsza trasa jest krótsza, ale ma schody, czyli barierę dla tego profilu; aplikacja proponuje łatwiejszą, nawet jeśli jest dłuższa. | konkretne bariery |
| 10 | Zmień profil na **„Wózek dziecięcy”** | Trasa przelicza się od razu, a ocena miejsc się zmienia. | indywidualne potrzeby |
| 11 | „O danych” → **„symuluj niedostępność OpenStreetMap”** | W tabeli źródeł OpenStreetMap i przystanki ZTP przechodzą na „Zapisana kopia” z datą i przyczyną; na telefonie nad mapą jest plakietka „OpenStreetMap nie odpowiada · kopia z …”, a przy trasie komunikat o kopii chodników. Bez kopii: jasny komunikat, brak udawanej trasy. | **źródło niedostępne** |
| 12 | Karta miejsca → „Udostępnij lub osadź” → podgląd | Jedna linia HTML dla hotelu lub organizatora, a karta pokazuje aktualne dane ze źródłami. | wdrożenie u odbiorców |
| 13 | Tab od początku strony: skip link → profil (spacja) → miejsce (Enter) → zgłoszenie → Escape | Wszystko z klawiatury, widoczny fokus, a lista jest alternatywą dla mapy. axe: 0 naruszeń. | **kontrola dostępności** |
| 14 | Slajdy 8–10: „Wdrożenie i skalowanie”, „Model biznesowy”, „Stan prototypu i plan” | Operator, partnerzy, koszty, przychody, karta do osadzenia, kolejne miasto = 1 plik konfiguracji, plan pilotażu. | plan wdrożenia |

## Film (maks. 3:00)

**Nagrany film:** `docs/prezentacja/feelfree-mobile.mp4` (1 min, bez lektora, z napisami po polsku, na prawdziwych danych OpenStreetMap i miasta; tylko krótka sekwencja dziesięciu wejść w 3D korzysta z danych przykładowych, co film podpisuje). Pokazuje aplikację na telefonie w pięciu krokach: wybór potrzeb i oceny na mapie i liście → karta miejsca z faktami, źródłami i wejściem w 3D (w tym dziesięć wariantów wejścia: bez schodów, ze stopniami, z podjazdem, z podnośnikiem, z nieznaną liczbą stopni) → trasa: najpierw zwykła droga z jej barierami, potem łatwiejsza → ustawienia dla wzroku (większy tekst i kontrast, czytanie na głos) → dane miasta: przystanek z oficjalnego rejestru ZTP (peron, wiata, nawierzchnia, z datą). Na mapie zwykła trasa ma czerwono-żółte paski, a łatwiejsza jest zielona.

Poniżej scenariusz dłuższej wersji z lektorem (do nagrania, jeśli starczy czasu):

| Czas | Obraz | Lektor |
|---|---|---|
| 0:00–0:15 | ulica w Krakowie, schody, krawężnik; potem logo | „Znaczek ‘dostępne’ nie mówi, czy *Ty* wejdziesz. Dla jednej osoby barierą są dwa stopnie, dla innej wąskie drzwi albo kilometr bruku.” |
| 0:15–0:35 | wybór profilu „Wózek inwalidzki”, szczegóły | „Feel Free pyta o bariery, nie o diagnozę. Ustawiasz, ile stopni pokonasz, jakie drzwi i jaki podjazd. Ustawienia zostają w telefonie.” |
| 0:35–1:10 | karta Sukiennic: fakty, źródła, sprzeczność; Collegium Maius: stare dane; Schindler: brak danych | „Każdy fakt ma źródło, datę i poziom wiarygodności. Gdy źródła się różnią, widzisz obie wersje. Stare dane są oznaczone, a brak danych nigdy nie udaje dostępności.” |
| 1:10–1:55 | trasa Kraków Główny → Sukiennice, lista „Po drodze”, najkrótsza trasa linią w czerwono-żółte paski, zmiana profilu | „Trasa omija schody i wysokie krawężniki i pokazuje wszystko po drodze: bruk, przejścia bez danych, ławki, toalety. Widać też, co omijamy na najkrótszej drodze.” |
| 1:55–2:15 | symulacja awarii OSM, pasek z kopią zapasową | „Gdy źródło nie działa, aplikacja mówi to wprost i pokazuje kopię z datą. Miasto nie musi utrzymywać żadnej bazy.” |
| 2:15–2:35 | okno „Osadź”, karta na przykładowej stronie hotelu | „Hotele, organizatorzy i właściciele osadzają kartę jedną linią kodu. Na tym zarabiamy: profile zweryfikowane, audyty z partnerami, strony wydarzeń, API.” |
| 2:35–2:50 | nawigacja klawiaturą, przełącznik PL/EN | „Interfejs jest projektowany pod WCAG 2.2 AA: klawiatura, czytniki ekranu, kontrast i tekst zamiast mapy.” |
| 2:50–3:00 | konfiguracja miasta, logo | „Nowe miasto to jeden plik konfiguracji: najpierw Kraków, potem kolejne miasta.” |

Przy nagrywaniu **oznacz dane przykładowe**: w kadrze widać etykiety „Dane przykładowe”, a lektor może dodać: „część danych w demonstracji to dane przykładowe, wyraźnie oznaczone”.
