# Forma — project requirements and context

## Latest requirements — November 6, 2026

- Selected elements support arrow-key nudging: furniture moves in all four directions; doors accept only Left/Right and slide along their supporting wall without crossing its endpoints; walls never move through arrow keys. Dimension arrows adjust only the perpendicular label/baseline offset, preserving measured endpoints. Implementation defaults: 1 cm per keypress, Shift for 10 cm, independent of display units and snapping; each effective move is undoable. Inputs, editable content, dialogs, drawing tools and active pointer drags retain their normal keyboard behavior. Right moves doors toward screen-right, or screen-down on vertical walls, independent of wall endpoint order.
- Wall preview regression: bind the default animation-frame APIs to `globalThis`; calling native browser APIs as methods of the scheduler's clock object can throw an illegal invocation and freeze pointer previews. The DOM test clock now rejects invalid receivers, reproducing the frozen preview before the fix and verifying free-hover updates afterward.
- Wall drawing continues as a connected path, like the Photoshop Pen tool. The first click fixes the start; every subsequent click commits a segment and starts the next preview from that endpoint. Enter ends the current path without committing the unfinished preview. Clicking an existing wall (including an earlier segment in the same path) snaps the endpoint onto it and ends the path. The wall tool stays selected for starting another path. Free mouse movement previews the wall and cm/m length; releasing the button never commits or cancels it. This supersedes the earlier two-click completion behavior. Preview updates remain frame-coalesced without saving intermediate geometry; each committed segment is one undo step.
- Use a uniform background grid: equal square cells and consistent line color/weight, without emphasized larger grid divisions. Keep the spacing square during pan and zoom.
- Start with an empty canvas; do not preload the sample apartment. Remove untouched demo content from older autosaves while preserving user edits.
- Remove the V, H, W, D, K, F and P tool-selection shortcuts, including toolbar labels, tooltips and help entries. Toolbar buttons remain available.
- Keep README and Markdown documentation in English. The older Serbian sections below still require translation.
- See [Empty startup and tool selection](docs/STARTING_PLAN.md) for implementation and migration details. These requests supersede the initial sample-plan and tool-shortcut decisions recorded below.

Poslednje ažuriranje: **6. novembar 2026.**

Ovaj dokument čuva relevantne korisničke zahteve, dogovoreni obim i razliku između zahteva i implementacionih odluka. Ažurirati ga pri svakom novom zahtevu ili promeni odluke. Ne označavati optimizaciju kao izmereno poboljšanje dok ne postoje merenja.

## Izričiti korisnički zahtevi

### Prva poruka — aplikacija za 2D planiranje prostora

- Napraviti floor planner aplikaciju u **Svelte-u**, uz **Tailwind CSS**. Korisnik bira Svelte zbog brzine.
- Pozadina je grid u prijatnoj, mlečnoj boji.
- Sa strane se nalazi toolbar sa alatima.
- **Zidovi:** pri izboru alata prvo uneti debljinu zida, zatim crtati na platnu.
- **Vrata:** prvo uneti širinu, zatim postaviti vrata na zid. Položaj miša treba da određuje otvaranje prema unutra/spolja i levo/desno.
- **Kotiranje:** prvi klik određuje početak, drugi kraj, a zatim se kota pomera gore/dole/levo/desno da se odredi mesto ispisa.
- **Štampa:** prevlačenjem selektovati deo grida i pripremiti taj deo za A4 papir.
- **Navigacija:** neograničeno platno i pomeranje u oba pravca, nalik Figmi.
- **Jedinice:** na vrhu prekidač za metre/centimetre. **Centimetri su podrazumevani.**
- **Nameštaj i oprema:** frižider, šporet, mašina za sudove, zamrzivač, sudopera, radna površina, WC šolja, tuš kabina, veš mašina, lavabo i dodatni odgovarajući elementi.
- Elementi moraju imati prepoznatljive arhitektonske 2D simbole odozgo; primeri su četiri ringle na šporetu i spirala/bubanj na veš mašini.
- Kuhinjski elementi automatski se spajaju kada se postave jedan pored drugog.
- Prekidačem prikazati/sakriti granice između spojenih kuhinjskih elemenata, slično AutoCAD-u.

### Druga poruka — struktura, dokumentacija i odziv

- Napraviti **dobru, održivu strukturu koda**.
- **Svaka funkcija mora imati JSDoc**, uključujući pomoćne funkcije, event handlere, callback funkcije i gettere/settere u kodu projekta.
- **Performanse su veoma važne; korisnik traži savršen INP.** To je prioritet dizajna, a ne tvrdnja da je bilo koji rezultat već garantovan na svim uređajima.
- Napraviti Markdown fajl i u njega unositi sve relevantne dosadašnje i buduće zahteve. Ovaj fajl ispunjava taj zahtev.

## Implementacione odluke (nisu dodatni korisnički zahtevi)

- Lokalni projekat: `C:\Projects\floorPlanner`.
- Ime aplikacije: **Forma**; interfejs na srpskom, latinicom, sa maslinastim akcentima.
- Svelte 5, Vite, Tailwind 4, SVG prikaz plana i Lucide ikone.
- Geometrija se interno čuva u centimetrima; promena cm/m menja prikaz i unos, bez promene geometrije.
- Grid je 20 cm, prijanjanje na mrežu je 5 cm i može da se isključi.
- Space + prevlačenje / H pomera platno. Scroll pomera po osama, Shift + scroll horizontalno, Ctrl/Cmd + scroll zumira oko pokazivača.
- Zidovi se crtaju povezanim klikovima; Shift ograničava pravac. Esc završava alat.
- Dodati su izbor/pomeranje/rotacija/brisanje elemenata, uređivanje svojstava, undo/redo i prečice.
- Postoji početni ilustrativni primer stana i mogućnost novog praznog projekta.
- Projekat se automatski čuva lokalno u **IndexedDB**; raniji `localStorage` format se čita radi migracije. Nema korisničkog naloga, servera ni sinhronizacije među uređajima.
- JSON uvoz/izvoz služi za prenosivu rezervnu kopiju. Ograničenje uvoza: 5 MB i najviše 10.000 stavki po kolekciji; to je validaciona granica, ne obećanje performansi za tako veliki plan.
- A4 štampa podržava orijentaciju i uklapanje ili razmere 1:20, 1:50 i 1:100. PDF je dostupan kroz sistemski dijalog pregledača.

## Pravila razvoja

1. Čuvati jasne granice između UI komponenti, interakcija editora, čiste geometrije i sporednih efekata.
2. Dokument je nepromenljiv: nove izmene koriste strukturno deljenje; postojeće istorijske reference se ne mutiraju.
3. `pointermove` ne sme da serijalizuje dokument, zapisuje u skladište ili pravi istorijski snapshot.
4. Privremeni prikaz prevlačenja ažurira se najviše jednom po animation frame-u. Poslednji položaj mora da se obradi pre potvrde na `pointerup`.
5. `pointercancel`, gubitak fokusa i Esc otkazuju privremenu izmenu bez oštećenja istorije.
6. Stabilne SVG stavke koriste ključeve. Računanje kuhinjskih granica ne ponavljati za svaki pomeraj miša.
7. Koristiti prostorni indeks za lokalna geometrijska poređenja; izbegavati nepotrebne kvadratne petlje.
8. JSDoc mora da opisuje svrhu, parametre, rezultat i važne efekte/invarijante funkcije. Automatska provera sprečava nedokumentovane funkcije; smislenost dokumentacije zahteva pregled.
9. Dodati regresione testove za promene interakcija, geometrije, istorije i skladištenja.
10. Ažurirati ovaj dokument posle novih korisničkih zahteva, a arhitekturu i postupak merenja u `docs/` kada se promene.

## INP i granice verifikacije

- Cilj je što kraći odziv; početni interni cilj za reprezentativne interakcije je **ispod 100 ms**, a granica „dobrog“ INP-a po Web Vitals je **200 ms ili manje na 75. percentilu poseta**, odvojeno za mobilne i desktop uređaje.
- INP uključuje kašnjenje pre handlera, obradu i čekanje sledećeg prikaza. Brzi unit testovi i trajanje jedne funkcije nisu INP.
- Kontinuirano prevlačenje/pomeranje dodatno proveravati kroz frame time i long-task tragove; `pointermove` samo po sebi nije kompletan INP scenario.
- Dodato je **opt-in lokalno merenje** kroz `?performance=1` i `window.__FORMA_PERFORMANCE__`; nema mrežnog slanja telemetrije.
- Izmereni INP u stvarnom pregledaču i terenski p75 još nisu potvrđeni. U prethodnom pokušaju ugrađeni pregledač nije bio dostupan, a Chrome automatizacija nije bila odobrena. DOM simulacija nije zamena za vizuelnu ili terensku proveru.
- Referenca: [Optimize INP](https://web.dev/articles/optimize-inp), [INP metric](https://web.dev/articles/inp).

## Poznata funkcionalna ograničenja

- Površine/nazivi soba i podovi početnog primera su ilustrativni; ne preračunavaju se automatski iz zidova.
- Planer je 2D alat i ne obavlja građevinske ili statičke proračune.
- Vrata su vezana za zid; spajanje kuhinjskih elemenata podržava poravnate elemente i rotacije u koracima od 90°.
- Za fizički tačnu razmeru štampati na 100% bez dodatnog skaliranja u dijalogu štampe.
- IndexedDB je lokalno skladište, ne rezervna kopija. Brisanje podataka pregledača briše lokalni projekat; korisnik može preuzeti JSON.

## Evidencija promena

| Datum      | Zahtev / odluka                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-06 | Početni funkcionalni zahtevi za Svelte + Tailwind floor planner.                                                         |
| 2026-11-06 | Prva implementacija Forma interfejsa, SVG geometrije, alata i lokalnog čuvanja.                                          |
| 2026-11-06 | Korisnik zahteva modularnu strukturu, JSDoc svake funkcije, prioritet INP-a i trajnu Markdown evidenciju.                |
| 2026-11-06 | Razdvojeni UI, kontroler, geometrija i servisi; privremeni drag, indeksiranje, asinhrono čuvanje i lokalna dijagnostika. |
