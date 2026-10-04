# Aplikacja Feel Free

Opis projektu, dokumentacja i instrukcja wdrożenia: [README w katalogu głównym](../README.md).

| Katalog | Zawartość |
|---|---|
| `src/core` | model danych, ocena miejsc, trasy (bez Reacta, testowane w Node) |
| `src/data` | adaptery źródeł: OpenStreetMap, kopie zapasowe, zgłoszenia, dane przykładowe |
| `src/community` | opinie i zdjęcia: klient `/api`, zapis lokalny, zdjęcia z Wikimedia Commons |
| `src/components` | interfejs: mapa 3D, panel, karta miejsca, trasa, okna dialogowe |
| `api` | funkcje serwerowe (Vercel): opinie, zdjęcia, moderacja AI |
| `scripts` | potok danych (`npm run data:fetch`) |

```sh
npm install
npm run dev        # aplikacja i /api na http://localhost:5173
npm test           # testy rdzenia i API
npm run lint
npm run build
```

Zmienne środowiskowe: `.env.example`.
