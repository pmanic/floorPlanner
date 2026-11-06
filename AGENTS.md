# Pravila rada na Forma projektu

- Pre izmena pročitaj `PROJECT_CONTEXT.md`; to je trajna evidencija korisničkih zahteva. Dopuni ga kada korisnik uvede novi zahtev ili promeni postojeći.
- Svaka funkcija u kodu projekta mora imati JSDoc. Uključi callback funkcije, event handlere i gettere/settere; izuzeti su generisani build fajlovi i zavisnosti.
- Performanse i INP su prioritet. Ne stavljaj JSON serijalizaciju, skladištenje, duboko kopiranje celog plana ili pretragu svih parova u kontinuirane input handlere.
- Čuvaj nepromenljivost dokumenta i istorije. Drag preview je privremen; dokument se menja na potvrdi.
- Prati `docs/ARCHITECTURE.md` i `docs/PERFORMANCE.md`. Ne tvrdi da je INP izmeren samo zato što build ili testovi prolaze.
- Pokreni relevantne testove i `npm run check`, `npm run check:jsdoc`, `npm run format:check`, `npm run build` posle značajnih izmena.
