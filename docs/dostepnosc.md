# Dostępność cyfrowa prototypu

Cel rozwoju: **WCAG 2.2 na poziomie AA**. Poniżej opisujemy, co prototyp już spełnia, jak to sprawdziliśmy, jakie ograniczenia znamy i jak je usuniemy.

## Co jest zrobione

**Obsługa klawiaturą**

- Pierwszy element strony to link „Przejdź do listy miejsc”, widoczny po otrzymaniu fokusu.
- Wszystkie elementy sterujące to natywne przyciski, pola i pola wyboru, więc działają Tab, Enter i spacja.
- Widoczny fokus: obramowanie 3 px w kolorze o kontraście ≥ 3:1.
- Po otwarciu karty miejsca fokus przechodzi na jej nagłówek.
- Okna dialogowe (natywny `<dialog>`) zatrzymują fokus w środku, zamykają się klawiszem Escape i oddają fokus elementowi, który je otworzył.
- Wskazywanie punktu na mapie bez myszy: strzałki przesuwają mapę, Enter wybiera punkt pod krzyżykiem, Escape anuluje.
- Zakładki karty miejsca (przegląd, zdjęcia, opinie, informacje) działają wg wzorca WAI-ARIA: strzałki, Home i End przełączają zakładki.
- Panel na telefonie można przesuwać palcem, ale ma też przycisk (uchwyt) z nazwą „Rozwiń panel” / „Zwiń panel”, więc działa z klawiatury i czytnika.
- Przyciski mapy (widok 3D, zdjęcie lotnicze, kompas, legenda, lokalizacja, przybliż, oddal) mają nazwy i stany (`aria-pressed`, `aria-expanded`). Przybliżanie działa też bez gestów dwoma palcami.

**Czytniki ekranu**

- Struktura punktów orientacyjnych: `header` z wyszukiwarką (`role="search"`), `main` z listą lub kartą miejsca, region mapy z etykietą.
- Nagłówki h1–h3 w logicznej kolejności.
- Przyciski profili i zakładek mają `aria-pressed`.
- Stan danych, wynik trasy, potwierdzenia i komunikaty są ogłaszane przez regiony `role="status"`.
- Każda ikona statusu ma tekst, a dla czytnika dodatkowo słowny poziom („Bariera:”, „Brak danych:”).
- Rysunek 3D wejścia jest ukryty przed czytnikiem, bo te same fakty są wyżej w formie tekstu.

**Tekstowa alternatywa dla mapy**

- Każde miejsce z mapy jest na liście z wynikiem i stanem kluczowych aspektów (wejście, drzwi, toaleta…).
- Trasa ma tekstowy opis odcinków (ulica, długość) i uporządkowaną listę „Po drodze” z odległością od startu; źródło i zakres dat danych trasy są pod listą.
- Mapa jest uzupełnieniem: da się z niej w ogóle nie korzystać.

**Kontrast i czytelność**

- Kolory statusów mają kontrast z białym tekstem 5,1–6,6:1, tekst pomocniczy 6,1:1 (wymóg AA: 4,5:1). Paleta jest sprawdzona skryptem: `#1a7f37` 5,08; `#8a5a00` 5,93; `#b42318` 6,57; `#57606a` 6,39; akcent `#0b57d0` 6,39.
- Bazowy rozmiar tekstu to 16 px, strona działa przy powiększeniu do 200% i na telefonie (układ jednokolumnowy).
- Elementy dotykowe mają co najmniej 32–44 px (WCAG 2.2: 2.5.8 wymaga minimum 24 px); na ekranach dotykowych przyciski, filtry i lista wyboru mają co najmniej 44 px.

**Ustawienia dla wzroku** (przycisk „Aa”: na telefonie na mapie obok znaku „i”, na komputerze przy wyszukiwarce i na ekranie trasy, do tego w menu; wybór zapisany w przeglądarce)

- *Większy tekst i wysoki kontrast*: tekst większy o jedną czwartą (20 px), czarny na białym, pełne tła paneli zamiast szkła, grubsze obramowania i obrys fokusu.
- *Czytanie na głos*: synteza mowy wbudowana w przeglądarkę (nic nie jest wysyłane). Po otwarciu miejsca czyta nazwę, ocenę i powody od najpoważniejszego; po wyznaczeniu trasy ocenę, długość, to, co jest po drodze (z odległością od startu), i opis odcinków. Przycisk „Przeczytaj na głos” powtarza lub zatrzymuje. Osoby z czytnikiem ekranu zostawiają tę opcję wyłączoną.

**Nie tylko kolor**

Każdy status ma własny kształt i znak, na liście i na mapie: koło z ✓ (spełnia), trójkąt z ! (utrudnienie), ośmiokąt z × (bariera), przerywane koło z ? (brak danych). Do tego zawsze jest tekst. Na pinezkach mapy ten sam kształt jest w rogu, obok koloru; schody na mapie mają kolor i własny wzór linii (przerywana).

**Szkło na mapie (glassmorphism)**

- Panele z tekstem są w 86% nieprzezroczyste, więc tekst ma kontrast AA nawet nad ciemnym fragmentem mapy; tekst pomocniczy jest tylko na tych panelach.
- Gdy przeglądarka nie obsługuje rozmycia albo użytkownik włączył „ogranicz przezroczystość”, panele są pełne.
- W trybie wymuszonych kolorów (Windows) panele dostają obramowanie.
- Na telefonie panel dolny ma pełne tło: zajmuje pół ekranu, więc tekst jest czytelniejszy, a telefon nie rozmywa pod nim mapy 3D w każdej klatce. Szkło zostaje na małych elementach (wyszukiwarka, filtry, przyciski mapy).

**Telefon**

- Gdy użytkownik zaczyna pisać w panelu (trasa, opinia), panel otwiera się w całości, żeby klawiatura ekranowa nie zasłaniała pola.
- Mapa jest rysowana najwyżej w podwójnej gęstości pikseli, a nazw miejsc jest na wąskim ekranie mniej, żeby nie zasłaniały mapy.
- Model 3D wejścia wczytuje się dopiero, gdy sekcja zbliża się do ekranu, i jest rysowany tylko przy zmianie (obrót, przybliżenie), a nie w każdej klatce.
- Przy włączonym w przeglądarce oszczędzaniu danych domyślnym podkładem jest rysowana mapa, nie zdjęcie lotnicze.
- Widok trasy: po wybraniu obu punktów wstęp i przykładowe trasy ustępują miejsca wynikowi; trasa jest dopasowana do widocznej części mapy także po przesunięciu panelu (dopóki użytkownik sam nie ruszy mapy); pinezki innych miejsc bledną, a na linii zawsze widać problemy, ławki i obniżone krawężniki tylko tam, gdzie jest miejsce. Dwie trasy różnią się wzorem, a nie tylko kolorem: zwykła ma czerwono-żółte paski na ciemnym obrysie, łatwiejsza jest jednolita, zielona; obie są podpisane w legendzie i w panelu.
- Ekran się nie przesuwa, gdy przeglądarka przewija do pola z fokusem: przewija się tylko panel.
- Na niskich ekranach (większość telefonów w przeglądarce zostawia stronie 600–750 px wysokości) przyciski mapy ustawiają się w dwóch kolumnach i jednym rzędzie, żeby nie nachodziły na siebie ani na panel; legenda otwiera się obok nich.
- Pola wyboru i wyszukiwania mają na ekranach dotykowych tekst 16 px, bo iOS Safari przy mniejszym powiększa całą stronę po dotknięciu pola.
- Sprawdzone automatycznie (Playwright) na trzech silnikach: WebKit, czyli Safari (iPhone 390×844 i 320×568, iPad pionowo i poziomo, Mac), Chromium (Android 412×915 i 360×640, komputer) i Firefox (Android, komputer): lista, mapa, karta miejsca, wejście 3D, ustawienia dla wzroku i trasa. Testy na fizycznych urządzeniach są w planie pilotażu.

**Pozostałe**

- Atrybut `lang` przełącza się z językiem (PL/EN). Nazwy w drugim języku mają własne `lang`.
- Przy ustawieniu systemowym „ogranicz ruch” animacje są wyłączone, a mapa przeskakuje zamiast płynnego lotu.

## Jak sprawdziliśmy (3 paź 2026)

| Test | Narzędzie / metoda | Wynik |
|---|---|---|
| Automatyczny audyt głównego scenariusza: start, wybór profilu, karta miejsca, trasa, okno udostępniania, karta osadzona | axe-core 4.x (Playwright, Chromium) | **0 naruszeń** (po poprawkach: punkty orientacyjne, unikalne nazwy regionów) |
| Nowy interfejs (komputer 1440×900 i telefon 390×844): lista, karta miejsca z zakładkami, przeglądarka zdjęć, opinie, dodawanie zdjęcia, informacje, menu, trasa | axe-core (Playwright, Chromium) | **0 naruszeń** (po poprawce: przewijana tabela danych dostępna z klawiatury) |
| Przejście tylko klawiaturą: skip link → profil (spacja) → miejsce (Enter) → zgłoszenie → Escape → zakładka Trasa | skrypt Playwright + ręcznie | wszystkie kroki wykonalne; fokus widoczny; fokus wraca po zamknięciu okna |
| Drzewo dostępności (role, nazwy, stany) | snapshot ARIA (Playwright) | poprawne role i nazwy; pary przycisków „Wskaż na mapie” rozróżnione nazwą pola (Skąd/Dokąd) |
| Kontrast | obliczenie wg WCAG 2.x dla palety | wszystkie pary tekst/tło ≥ 4,5:1 |
| Mapa bez wzroku | lista miejsc + opis trasy + lista zdarzeń | pełna informacja dostępna bez mapy |

## Znane ograniczenia i plan

| Ograniczenie | Wpływ | Plan usunięcia |
|---|---|---|
| Brak testów z prawdziwymi czytnikami (NVDA, JAWS, VoiceOver, TalkBack) i z użytkownikami | możliwe problemy z kolejnością ogłoszeń i długością list | testy z organizacjami osób z niepełnosprawnościami w pierwszym miesiącu pilotażu |
| Znaczniki na mapie nie są osobno dostępne z klawiatury | mapa wymaga myszy lub dotyku do wyboru miejsca | lista jest pełną alternatywą; planujemy nawigację po znacznikach (Tab w obszarze mapy) |
| Opisy zdjęć od użytkowników tworzy AI | opis może być niepełny | opis jest oznaczony „AI widzi”; autor może dodać własny podpis |
| Długie listy (wiele miejsc, wiele zdarzeń na trasie) | dużo przewijania przy czytniku | długa lista „Po drodze” otwiera się już z samymi problemami (bariery, utrudnienia, braki danych), reszta jest pod przyciskiem „Pokaż wszystkie”; planujemy grupowanie (np. „5 ławek po drodze”) |
| Model 3D wejścia jest tylko wizualny | brak informacji przestrzennej dla osób niewidomych | treść jest w tekście; rozważamy zdjęcia wejść z opisem alternatywnym |
| Etykiety mapy podkładowej pochodzą od dostawcy kafelków | kontrast etykiet poza naszą kontrolą | własny styl mapy o wysokim kontraście |
| Tryb dla słabowidzących nie zmienia mapy podkładowej | etykiety ulic i podkład zostają bez zmian | własny styl mapy o wysokim kontraście i większych etykietach |
| Czytanie na głos zależy od głosów w systemie i nie prowadzi w czasie rzeczywistym | bez polskiego głosu tekst czyta głos domyślny; trasa jest czytana w całości, nie krok po kroku | prowadzenie na żywo z lokalizacją (asystent głosowy z planu) |
| Teksty z OSM (opisy dostępności) są w języku autora | możliwy brak tłumaczenia | oznaczanie języka opisu, tłumaczenie maszynowe z oznaczeniem |

Deklarację dostępności usługi (wymaganą od podmiotów publicznych przez ustawę o dostępności cyfrowej) przygotujemy w tym formacie przed publicznym uruchomieniem.
