# Performanse i INP

## Cilj i pošteno merenje

Korisnik daje najviši prioritet odzivu. Interni početni cilj je <100 ms za reprezentativne interakcije; terenski „dobar“ INP je ≤200 ms na p75. Rezultat zavisi od uređaja, veličine plana i pregledača. Ne postoji garantovan „savršen INP“ bez merenja i ograničenja opterećenja.

INP obuhvata input delay + processing duration + presentation delay. Kontinuirano pomeranje miša nije zamena za klik/tastaturu kao INP scenarije. [Definicija i pragovi](https://web.dev/articles/inp), [smernice za optimizaciju](https://web.dev/articles/optimize-inp).

## Uklonjeni izvori nepotrebnog rada

| Pre                                                                           | Sada                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| JSON.stringify u reaktivnoj putanji svake promene plana                       | Upis nepromenljivog snapshot-a u odloženu IndexedDB transakciju               |
| JSON snapshot na početku prevlačenja, zamena celog plana na svaki pointermove | Privremeni preview; jedan commit i istorijski korak na pointerup              |
| JSON parse/stringify za undo/redo                                             | Ograničena istorija referenci sa strukturnim deljenjem                        |
| Kopiranje svih entiteta radi izbora jednog                                    | ID indeks i kopiranje samo odabranog entiteta                                 |
| Poređenje svakog kuhinjskog elementa sa celom kolekcijom tokom rendera        | Prostorni hash i zajedničke ivice izvedene po potvrđenoj reviziji             |
| Obrada svakog pointermove-a                                                   | Najnoviji uzorak po animation frame-u, uz završni flush                       |
| Višestruki layout read po događaju                                            | Keš canvas granica, invalidacija pri resize/scroll i novi read na pointerdown |
| Kreiranje Intl formatters tokom interakcija                                   | Jedan formatter po jedinici                                                   |
| JSON konverzija velikog fajla na glavnoj niti                                 | Worker koji se gasi po završetku                                              |

`requestAnimationFrame` nije mesto za težak posao: callback radi samo geometriju trenutnog preview-a. Samo odlaganje posla nije dokaz dobrog INP-a. Upis velikog snapshot-a i strukturirano kloniranje još mogu imati cenu; ne pretpostavljati da je asinhroni API besplatan.

## Lokalna dijagnostika

1. `npm run build`, zatim `npm run preview`.
2. Otvoriti ispisani lokalni URL sa `?performance=1`.
3. Obaviti klikove i prečice, ne samo hover/pan. U DevTools pregledati `window.__FORMA_PERFORMANCE__`.
4. `inp` dolazi iz zvanične `web-vitals` biblioteke; `longTasks` je ograničena lista dugih taskova. `null` nije 0 ms: znači da još nema prijavljenog uzorka ili da API nije podržan.
5. Podaci ostaju u memoriji ovog taba. Nema analytics endpoint-a ni slanja telemetrije.

## Scenariji za DevTools Performance

- Otvaranje alata za zid/vrata, promena jedinica i promena svojstava.
- Izbor elementa, brisanje, undo/redo i pretraga biblioteke.
- Drag nameštaja, zida sa vratima, vrata uz zid i pomeranje kote.
- Brz pointerdown/move/up unutar jednog frame-a; Esc i pointercancel tokom drag-a.
- Zumiranje oko pokazivača, dijagonalni trackpad scroll i Shift+scroll.
- Prekidač kuhinjskih granica na većoj kuhinji.
- Uvoz, izvoz i priprema štampe dok je aktivno lokalno čuvanje.
- Proveriti normalan i usporen CPU profil, mali ekran i stvarni slabiji uređaj.
- Početni plan, 100, 500 i 1.000 elemenata; veći planovi služe za nalaženje granica, ne predstavljaju obećani kapacitet.

Za svaki trag zapisati browser verziju, uređaj/CPU throttling, broj entiteta, korake, INP i najduži task. Pregledati scripting, layout i paint odvojeno. P75 zahteva više stvarnih poseta; rezultat jednog taba nije terenski p75.

## Automatizovane provere i njihova granica

`npm test` pokriva geometriju, indeks, istoriju, red čuvanja i životni ciklus interakcija u DOM simulaciji. `npm run benchmark` meri algoritamski deo na lokalnom Node runtime-u. To nisu browser INP merenja i ne mere SVG paint.

Build i testovi ne zamenjuju vizuelnu proveru, A4 dijalog štampe ni profilisanje u pregledaču. Stvarni INP u ovoj sesiji nije potvrđen jer browser automatizacija nije odobrena/dostupna.

## Dalje skaliranje prema dokazima

Ako tragovi pokažu bottleneck pri većim planovima: prvo razmotriti indeks zidova za vrata, zatim viewport culling za radni prikaz i renderer nezavisan od viewport-a za štampu. Ne uvoditi culling u štampu bez testa da se selektovani deo van trenutnog ekrana i dalje eksportuje. Za vrlo velike planove razmotriti canvas prikaz uz odvojen SVG print renderer.
