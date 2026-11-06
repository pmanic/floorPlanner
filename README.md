# Forma — planer prostora

Lokalna Svelte 5 aplikacija sa Tailwind CSS 4 i SVG platnom. Sve dimenzije u modelu su u centimetrima; cm/m prekidač menja prikaz i unos bez menjanja geometrije.

## Pokretanje

```sh
npm install
npm run dev
```

Produkcija: `npm run build`, zatim `npm run preview`. Provere: `npm run check` i `npm test`.

## Alati

- **V** — izbor i pomeranje elemenata; svojstva desno menjaju dimenzije i položaj. Delete briše element, R rotira nameštaj ili menja šarku vrata.
- **W** — debljina zida, zatim povezana serija klikova. Shift zaključava pravac vodoravno/uspravno; Esc završava.
- **D** — širina vrata, zatim postavljanje na zid. Strana pokazivača bira unutrašnje/spoljašnje otvaranje, pomeranje duž zida menja šarku. Svojstva daju eksplicitne prekidače. Vrata prate pomeranje svog zida.
- **K** — početak kote, kraj, pa položaj teksta. Kotira i dijagonalne linije.
- **F** — biblioteka kuhinje, kupatila, dnevne i spavaće sobe. Element se može više puta postaviti; Esc završava.
- **P** — prevuci oblast, izaberi A4 orijentaciju i razmeru. Štampa trenutne vidljive slojeve bez mreže; moguće je sačuvati PDF kroz sistemski dijalog. Za tačnu razmeru štampaj na 100%, bez dodatnog uklapanja.
- **Space + prevlačenje** ili **H** — pomeranje; scroll/trackpad pomera u obe ose, Shift+scroll horizontalno, Ctrl/Cmd+scroll zumira oko pokazivača; 0 uklapa plan.
- **Ctrl/Cmd+Z**, **Ctrl/Cmd+Shift+Z** — poništi/ponovi.

Kuhinjski elementi automatski prijanjaju kada su blizu. Prekidač granica uklanja ili prikazuje zajedničke ivice poravnatih kuhinjskih elemenata, uključujući rotacije od 90°, uz očuvanje simbola uređaja.

Projekat se automatski čuva u IndexedDB pregledača. Stariji localStorage format se čita radi migracije. Meni uz naziv projekta nudi preimenovanje, novi plan i JSON uvoz/izvoz. Čuvanje je lokalno, bez servera i korisničkog naloga.

Početni stan je ilustrativni primer. Nazivi/površine soba i podne obloge u primeru nisu automatski izvedeni iz zidova. Novi prazan projekat ih nema. Aplikacija je 2D planer i ne obavlja građevinske proračune.

## Struktura i standardi

- [Zahtevi i trajni kontekst projekta](PROJECT_CONTEXT.md) — sve relevantne korisničke odluke i ograničenja.
- [Arhitektura](docs/ARCHITECTURE.md) — granice komponenti, kontrolera i servisa.
- [Performanse i INP](docs/PERFORMANCE.md) — optimizacije, scenariji i granice merenja.
- [Pravila razvoja](AGENTS.md) — obavezan JSDoc i održavanje dokumentacije.

Svaka funkcija u održavanom kodu ima JSDoc; proverava ga `npm run check:jsdoc`. Formatiranje: `npm run format`, provera: `npm run format:check`.

`npm test` pokreće geometrijske i regresione testove, uključujući Svelte kontroler u simuliranom DOM-u. `npm run benchmark` meri geometrijske algoritme u Node-u, ne browser INP.

Za lokalnu INP dijagnostiku otvori aplikaciju sa `?performance=1` i pregledaj `window.__FORMA_PERFORMANCE__` u DevTools. Dijagnostika koristi `web-vitals`, ostaje u memoriji taba i ništa ne šalje na mrežu.
