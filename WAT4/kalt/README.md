# Projektarbeit — Testimplementierung

Arbeitsordner für die Web-Application-Testing-Projektarbeit. Alles hier ist
zusätzlich zum bestehenden evcc-Testbestand und kollidiert nicht mit
Vitest/Playwright/Go.

## Struktur

```
WAT4/kalt/
├─ docs/REPORT.md          # Testbericht (Layer-Übersicht, fachliche Begründung)
├─ test-analyse.md         # Analyse + fachliche Begründung (Pyramide, Targets)
├─ jest.config.cjs         # isolierte Jest-Config (nur *.jest.ts hier)
├─ tsconfig.jest.json      # TS-Setup für ts-jest
├─ unit-tests/             # 10 Unit-Tests (Jest)  ✅ lauffähig
├─ integration-tests/
│  └─ component/           # Component-Tests (Cypress CT)
├─ e2e-tests/              # System-Flow (Playwright Browser)
└─ load-tests/             # Lasttest (k6)
```

## Status

| Layer | Dateien | Tech | Status |
|---|---|---|---|
| Unit (10) | `unit-tests/*.jest.ts` | Jest + ts-jest | ✅ **34 Cases grün** |
| Integration (3) | `integration-tests/component/*.cy.ts` | Cypress CT | ✅ **8 Cases grün** |
| E2E (2) | `e2e-tests/*.spec.ts` | Playwright Browser | ✅ **4 Cases grün** |
| Load (1) | `load-tests/sessions-load.js` | k6 | ✅ Thresholds grün |

Fokus: fachliche evcc-Workflows (keine generischen Algorithmen).
Unit-Targets: `convertRates` (Tarif-Slots), `forecastSolar` (Solar-Forecast-Skalierung),
`tariffGenerateSlots` (Tarif-Slots im 15-min-Raster), `uiLoadpoints-layout`
(Loadpoint-Reihenfolge/Sichtbarkeit), `remote` (Remote-Client-Präsenz),
`ocpp` (Wallbox-URL), `forecastLowestSlot` (günstigstes Ladefenster),
`forecastStaticTariff` (statischer vs dynamischer Tarif),
`tariffCostRange` (Preisspanne min/max), `tariffFindRate` (geltender Tarif).
Integration (Cypress Component Testing, andere Komponenten als Moser):
`TariffChart` (Tarif-Slot-Rendering), `DateNavigator` (Sessions-Datumsnavigation),
`SessionTable` (Sessions-Tabelle Leer-/Datenzustand).
E2E: `loadpoint-flow` (Titel/Live-Leistung), `navigation-flow` (Tab-Leiste/Sessions).

Damit ist für **eine Person** das Pyramidengerüst angelegt (Unit voll umgesetzt,
übrige Layer als lauffähige, fachlich begründete Tests). P2 spiegelt die
Struktur mit disjunkten Targets (siehe `test-analyse.md`, Abschnitt 4).

## Ausführen

### Unit (sofort lauffähig)
```bash
npm run test:projektarbeit
# oder
npx jest -c tests/projektarbeit/jest.config.cjs
```

### Integration (Cypress Component Testing)
Kein Backend nötig — Komponenten werden isoliert gemountet.
```bash
npx cypress run --component --spec "WAT4/kalt/integration-tests/component/**/*.cy.ts"
# interaktiv:
npm run test:cypress:open
```

### E2E (Playwright)
Voraussetzung: evcc-Binary im Repo-Root. Build:
```bash
npm run build          # UI-Assets nach dist/
go build -o evcc.exe . # Binary (Windows: evcc.exe, Linux/macOS: evcc)
```
Boot-Helper `tests/evcc.ts` erwartet `./evcc.exe` (Windows) bzw. `./evcc`.
```bash
npx playwright test WAT4/kalt/e2e-tests
```

### Load (k6)
Terminal 1 — evcc starten:
```bash
./evcc --config tests/basics.evcc.yaml --disable-auth   # HTTP-Port 7070
```
Terminal 2 — Last fahren:
```bash
k6 run WAT4/kalt/load-tests/sessions-load.js
# Port abweichend:
BASE_URL=http://127.0.0.1:7070 k6 run WAT4/kalt/load-tests/sessions-load.js
```

## Hinzugefügte devDependencies
`jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom` (Unit-Layer).
Integration nutzt das bestehende Cypress-Setup (`cypress`, `@cypress/vite-dev-server`);
`cypress` wurde auf `^15` gehoben (Peer-Anforderung von `@cypress/vite-dev-server@7.3.3`).
`cypress.config.ts` `specPattern` um den Kalt-Component-Ordner erweitert,
Mosers Support-Datei (i18n-`mount`-Helper) wird mitgenutzt.
