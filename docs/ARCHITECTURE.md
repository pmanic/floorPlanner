# Arhitektura

## Granice modula

```text
src/
  App.svelte                 kompozicija ekrana
  components/
    layout/                  zaglavlje, biblioteka, canvas, inspector, status
    plan/                    trajna scena, drag preview, vrata, kote, nameštaj
    dialogs/                 podešavanje alata, štampa, pomoć
  editor/
    createEditor.svelte.js    reaktivno stanje i orkestracija interakcija
    entities.js              indeks izbora i nepromenljive izmene dokumenta
    history.js               ograničena istorija referenci
    tools.js                 stabilni metapodaci alata
  lib/
    geometry.js              čisti geometrijski proračuni
    spatialIndex.js          lokalni upiti i zajedničke kuhinjske ivice
    catalog.js               biblioteka i početni primer
    projectValidation.js     validacija spoljnog dokumenta
    units.js                 jedinice i keširani Intl formatters
    frameScheduler.js        najnoviji uzorak po frejmu
    focusDialog.js           fokus i tastatura u dijalozima
    yieldToBrowser.js        odlaganje posla do posle prilike za prikaz
  services/
    autosave.js              debounce i red asinhronih upisa
    projectStorage.js        IndexedDB i čitanje starog formata
    projectFiles.js          prenosivi JSON fajlovi
    printPlan.js             izdvojena priprema A4 iframe-a
  workers/                   JSON kodiranje/dekodiranje
  performance/               opt-in lokalna web-vitals dijagnostika
  styles/                    stilovi podeljeni po oblasti interfejsa
tests/                       regresioni testovi i DOM test okruženje
scripts/                     provera dokumentacije i performansi
```

## Tok izmene

`input → najnoviji uzorak po frejmu → privremeni overlay → pointerup → jedna izmena dokumenta → istorija i odloženo čuvanje`.

Kontroler koristi Svelte 5 `$state.raw` za nepromenljive kolekcije. Komponente čitaju samo potrebna reaktivna polja. `App.svelte` ne obrađuje geometriju. `PlanScene` ne zavisi od koordinata pokazivača; `DragPreview` prikazuje pomereni element i vrata vezana za pomereni zid. Slojevi trajne scene ne grade se ponovo zbog samog kretanja pokazivača.

## Invarijante

- Geometrija je u cm, prikaz/unos u cm ili m.
- ID je jedinstven kroz zidove, vrata, nameštaj i kote.
- Vrata referenciraju postojeći zid preko `wallId`.
- Sačuvani planovi i istorijske reference se ne mutiraju. Izmena zamenjuje samo relevantne kolekcije/objekte.
- Undo/redo ne radi stringify/parse ni deep clone. Istorija je ograničena na 70 koraka.
- Prostorni indeks se vezuje za referencu kolekcije kroz WeakMap; stari indeksi mogu biti oslobođeni sa istorijom.
- Poslednji pointer uzorak obrađuje se na puštanju miša; otkazivanje odbacuje preview.
- Sačuvano znači da je IndexedDB transakcija završena, ne da je upis tek zakazan.
- Uvoz prolazi validaciju; greška čuvanja prikazuje obaveštenje umesto lažnog statusa uspeha.

## Dodavanje funkcionalnosti

Novi simbol ide u `components/plan` i katalog. Čista geometrija ide u `lib`; ne zavisi od DOM-a. Pravila izmene dokumenta idu u `editor/entities.js` ili poseban domenski modul, uz testove nepromenljivosti. Spoljni efekti idu u `services`. Funkciju dokumentovati JSDoc-om pre dodavanja poziva iz UI-ja.

Štampa se učitava tek kada zatreba. JSON konverzija radi u worker-u; sam prenos podataka i render velikog SVG-a i dalje imaju cenu i zahtevaju merenje.
