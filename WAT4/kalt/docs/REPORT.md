# WAT4 Projektarbeit – Testbericht (Kalt)

**Modul:** WAT4 – Qualitätssicherung und Testen
**Datum:** 25. Juni 2026
**Bearbeiter:** Sebastian Kaltenegger
**Abgabe:** 27. Juni 2026

---

## 1. Anwendungsbeschreibung

### Was ist evcc?

**evcc** (EV Charging Control) ist ein quelloffenes Energiemanagementsystem für Elektrofahrzeuge. Es steuert Wallboxen, Photovoltaikanlagen, Hausspeicher und dynamische Stromtarife so, dass Elektrofahrzeuge möglichst günstig und solar geladen werden.

Das System ist als Heimserver konzipiert und wird auf einem lokalen Rechner (Raspberry Pi, NAS o. Ä.) betrieben. Die Benutzeroberfläche läuft im Browser und kommuniziert über **WebSocket** (Echtzeit-State) sowie eine **REST-API** (Nutzeraktionen) mit dem Go-Backend.

### Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Vue 3.5 (Composition + Options API), TypeScript, Bootstrap 5 |
| Build | Vite 8, vue-tsc |
| State | Reaktiver Singleton `store.ts` – einziger WebSocket-Eintrittspunkt |
| Backend | Go (REST-API + WebSocket; via `tests/evcc.ts` für Tests gebootet) |
| Persistenz | SQLite (Sessions) |

### Für diese Arbeit relevante Bausteine

- **`assets/js/utils/`** – reine Hilfsfunktionen (Tarif-Slots, Energie-Optionen, Forecast, OCPP-URL, Remote-Präsenz). Deterministisch, ideale Unit-Targets.
- **`uiLoadpoints.ts`** – leitet aus dem Roh-State die UI-Loadpoint-Liste ab (SoC-Planung, Reihenfolge, Sichtbarkeit, Anzeigetitel).
- **REST-API** `/api/state`, `/api/loadpoints/{id}/mode|mincurrent|limitsoc|phases/{wert}` – Steuerschnittstelle des Backends.

---

## 2. Teststrategie

### Mengengerüst & Testpyramide (Mike Cohn)

Pro Person mindestens **5 Unit / 3 Integration / 2 E2E / 1 Load = 11 Tests**. Die Verteilung ist bewusst pyramidenförmig: viele billige, schnelle, isolierte Tests unten (Unit), wenige teure, breite Tests oben (E2E/Load). Diese Arbeit übererfüllt das Minimum deutlich (siehe Tabelle).

Existierende Funktionalität darf laut Aufgabenstellung mit **anderer Technologie** erneut getestet werden. Das vorhandene Frontend nutzt **Vitest** – daher kommt hier durchgängig **Jest** zum Einsatz (anderer Runner: andere Fake-Timer-/ESM-/Matcher-Semantik → dieselbe Logik durch zwei Runner = stärkeres Vertrauen).

### Framework-Auswahl

| Test-Typ | Framework | Begründung |
|----------|-----------|------------|
| Unit | **Jest** + ts-jest | Bewusst anderer Runner als das vorhandene Vitest; isolierte Config (`*.jest.ts`), kollidiert nicht mit Vitest/Playwright |
| Integration | **Cypress Component Testing** | Echtes Chromium-Rendering einzelner Vue-Komponenten; prüft DOM, CSS-Klassen und Events ohne Backend. Gleiches Framework wie Moser, aber **andere Komponenten** |
| E2E | **Playwright** (Browser) | Echte User-Flows im Chromium gegen gebootetes evcc mit eigener Fixture |
| Last | **k6** | Greenfield – im Projekt existierte kein Lasttest; native Metriken/Thresholds, geringer Overhead pro VU |

### Testeinteilung (eigene Arbeit)

| Nr. | Typ | Framework | Datei | Cases |
|-----|-----|-----------|-------|-------|
| UT-1 | Unit | Jest | `unit-tests/convertRates.jest.ts` | 4 |
| UT-2 | Unit | Jest | `unit-tests/forecastSolar.jest.ts` | 6 |
| UT-3 | Unit | Jest | `unit-tests/forecastLowestSlot.jest.ts` | 3 |
| UT-4 | Unit | Jest | `unit-tests/forecastStaticTariff.jest.ts` | 3 |
| UT-5 | Unit | Jest | `unit-tests/ocpp.jest.ts` | 3 |
| UT-6 | Unit | Jest | `unit-tests/remote.jest.ts` | 3 |
| UT-7 | Unit | Jest | `unit-tests/tariffCostRange.jest.ts` | 3 |
| UT-8 | Unit | Jest | `unit-tests/tariffFindRate.jest.ts` | 2 |
| UT-9 | Unit | Jest | `unit-tests/uiLoadpoints-layout.jest.ts` | 3 |
| UT-10 | Unit | Jest | `unit-tests/tariffGenerateSlots.jest.ts` | 4 |
| IT-1 | Integration | Cypress CT | `integration-tests/component/TariffChart.cy.ts` | 3 |
| IT-2 | Integration | Cypress CT | `integration-tests/component/DateNavigator.cy.ts` | 3 |
| IT-3 | Integration | Cypress CT | `integration-tests/component/SessionTable.cy.ts` | 2 |
| E2E-1 | E2E | Playwright | `e2e-tests/loadpoint-flow.spec.ts` | 2 |
| E2E-2 | E2E | Playwright | `e2e-tests/navigation-flow.spec.ts` | 2 |
| LT-1 | Last | k6 | `load-tests/sessions-load.js` | – |

**Gesamt: 47 Testfälle** (34 Unit, 8 Integration, 4 E2E, 1 Lasttest).

---

## 3. Unit-Tests (Jest)

Fokus: **fachliche evcc-Funktionen** (Tarif, Energie, Forecast, Loadpoint-Ableitung) statt generischer Algorithmen. Reine Funktionen → deterministisch, nicht flaky, hoher ROI.

### UT-1: `convertRates.ts` – Tarif-Slot-Konvertierung
**Datei:** `unit-tests/convertRates.jest.ts`
**Testfälle:** `null` → leeres Array; leeres Array → leeres Array; `start`/`end` werden zu `Date`, `value` bleibt erhalten; Reihenfolge der Slots bleibt erhalten.
**Warum wichtig:** Wandelt die Roh-Tarifdaten des Backends in das vom UI erwartete Slot-Format. Ein Fehler hier verschiebt die gesamte Preis-/Forecast-Darstellung.

### UT-2: `forecast.adjustedSolar` – Solar-Forecast-Skalierung
**Datei:** `unit-tests/forecastSolar.jest.ts`
**Testfälle:** `undefined` bleibt `undefined`; ohne `scale` unverändert (Identität); skaliert `today`/`tomorrow`/`dayAfterTomorrow` `energy` mit dem Faktor; skaliert jeden `timeseries`-Wert; invertiert `scale` (4 → 0.25) für Rück-Adjustierung; mutiert das Eingangsobjekt nicht (deep copy).
**Warum wichtig:** `adjustedSolar` korrigiert die PV-Prognose mit einem Skalierungsfaktor (Kalibrierung der Solar-Vorhersage). Ein Fehler verfälscht die gesamte Solar-Forecast-Darstellung; die Nicht-Mutation ist kritisch, weil der Roh-State unverändert bleiben muss.

### UT-3: `forecast.findLowestSumSlotIndex` – günstigstes Ladefenster
**Datei:** `unit-tests/forecastLowestSlot.jest.ts`
**Testfälle:** findet Startindex des billigsten Fensters; berücksichtigt die ganze Fensterbreite; gibt `-1` wenn weniger Slots als Fensterbreite vorhanden.
**Warum wichtig:** Kernfunktion des Smart-Charging – ein Off-by-one verschiebt das Ladefenster und kostet direkt Geld.

### UT-4: `forecast.isStaticTariff` – statischer vs. dynamischer Tarif
**Datei:** `unit-tests/forecastStaticTariff.jest.ts`
**Testfälle:** `false` ohne Slots; `true` wenn alle Werte gleich; `false` bei unterschiedlichen Werten.
**Warum wichtig:** Entscheidet, ob Smart-Cost-UI überhaupt sinnvoll ist. Falsch-positiv blendet nutzlose Planung ein.

### UT-5: `ocpp.ts` – Wallbox-URL-Aufbau
**Datei:** `unit-tests/ocpp.jest.ts`
**Testfälle:** nutzt `externalUrl` wenn gesetzt; baut URL aus `hostname`+`port` als Fallback; hängt `stationId`-Platzhalter an.
**Warum wichtig:** Falsche OCPP-URL → Wallbox nicht erreichbar/konfigurierbar.

### UT-6: `remote.isRemoteClientActive` – Remote-Client-Präsenz
**Datei:** `unit-tests/remote.jest.ts`
**Testfälle:** `false` ohne `lastSeen`; aktiv wenn zuletzt < 5 min gesehen; inaktiv wenn > 5 min.
**Warum wichtig:** Steuert Online-Anzeige eines Remote-Clients – Zeitfenster-Grenze (5 min) ist die fehleranfällige Stelle.

### UT-7: `tariffSlots.calculateCostRange` – Preisspanne
**Datei:** `unit-tests/tariffCostRange.jest.ts`
**Testfälle:** `undefined` min/max bei leerer Liste; ermittelt kleinsten und größten Preis; ignoriert Slots ohne Wert.
**Warum wichtig:** min/max bilden die Preis-Skala der Forecast-Anzeige; `null`-Slots dürfen sie nicht verzerren.

### UT-8: `tariffSlots.findRateInRange` – geltender Tarif im Zeitfenster
**Datei:** `unit-tests/tariffFindRate.jest.ts`
**Testfälle:** findet den überlappenden Tarif-Slot; liefert `undefined` außerhalb aller Slots.
**Warum wichtig:** Liefert den zum aktuellen Zeitpunkt gültigen Preis – Grundlage jeder Kostenanzeige.

### UT-9: `uiLoadpoints` – Reihenfolge & Sichtbarkeit
**Datei:** `unit-tests/uiLoadpoints-layout.jest.ts`
**Testfälle:** ohne Konfiguration keine Reihenfolge, sichtbar; `setLoadpointOrder` vergibt Indizes in Listenreihenfolge; Sichtbarkeit lässt sich ausschalten.
**Warum wichtig:** Steuert, welche Ladepunkte in welcher Reihenfolge erscheinen – ein Bug versteckt Ladepunkte für den Nutzer.

### UT-10: `tariffSlots.generateRateSlots` – Tarif-Slots im 15-min-Raster
**Datei:** `unit-tests/tariffGenerateSlots.jest.ts`
**Testfälle:** leere/fehlende `rates` → leeres Array; `weekdayFormatter` setzt das `day`-Feld jedes Slots; jeder Slot ist exakt 15 min lang und `selectable` spiegelt `value !== undefined`; `isCharging`/`isWarning`-Callbacks werden korrekt durchgereicht.
**Warum wichtig:** `generateRateSlots` rastert die Roh-Tarife in das 15-min-Slot-Modell, das die gesamte Forecast-/Preis-Anzeige speist. Andere Funktion als deine `calculateCostRange`/`findRateInRange` (nutzt letztere intern). Falsche Rasterung verschiebt die Preis-/Lade-Markierung im UI.

---

## 4. Integrationstests (Cypress Component Testing)

Einzelne Vue-Komponenten werden im **echten Chromium** gemountet (`cy.mount`) und auf DOM-Struktur, CSS-Klassen und Events geprüft – ohne Backend. Bewusst **andere Komponenten** als Moser (dessen CT: `Mode`/`BatteryBoost`/`LimitSoc`), fachlich aus Kalts Domänen **Tarif** und **Sessions**. Geteilte Infrastruktur: Mosers `mount`-Helper (i18n-Mocks).

### IT-1: `TariffChart.vue` – Tarif-Slot-Rendering
**Datei:** `integration-tests/component/TariffChart.cy.ts`
**Testfälle:** rendert pro Slot ein `.slot`-Balken-Element (3 Slots → 3 Bars); ladender Slot erhält `.active`-Klasse; `inactive`-Prop setzt `.chart.inactive`.
**Warum CT:** Die Slot-Balken-Darstellung (Breite/Status-Klassen) ist reine DOM/CSS-Logik – im echten Browser prüfbar, in happy-dom nicht. Fachlich an Kalts Tarif-Units (`convertRates`, `tariffSlots`) anschließend.

### IT-2: `DateNavigator.vue` – Sessions-Datumsnavigation
**Datei:** `integration-tests/component/DateNavigator.cy.ts`
**Testfälle:** rendert Tages-Navigation (Prev/Next/Datepicker-Testids); Prev-Button ist am `startDate` `disabled`; Klick auf Next-Tag emittiert `update-date`.
**Warum CT:** Die Grenz-Logik (Prev/Next disabled an Datumsgrenzen) + Event-Emission wird im echten DOM mit Klick verifiziert. Fachlich an Kalts Sessions-Layer (E2E-Navigation, k6 `/api/sessions`).

### IT-3: `SessionTable.vue` – Sessions-Tabelle
**Datei:** `integration-tests/component/SessionTable.cy.ts`
**Testfälle:** ohne Sessions erscheint der Leer-Zustand (`sessions-nodata`), kein Tabellenkopf; mit Sessions wird pro Eintrag eine Zeile (`sessions-entry`) gerendert.
**Warum CT:** Bedingtes Rendering (Leer- vs. Datenzustand) und Zeilen-Mapping sind DOM-Verhalten. Fachlich Sessions-Darstellung.

**Warum Cypress CT als Integrationslayer:** Component Testing prüft das **Zusammenspiel** Komponente + Props + Sub-Komponenten + Formatter im echten Browser, ohne Backend – schneller/stabiler als E2E, realer als ein reiner Unit-Test. Gleiches Framework wie Moser, aber disjunkte Komponenten (siehe Abschnitt 10).

---

## 5. End-to-End-Tests (Playwright, Browser)

Echte User-Flows im Chromium gegen gebootetes evcc mit eigener Fixture → deterministischer Ausgangszustand. `beforeAll: start()` / `afterAll: stop()`.

### E2E-1: Loadpoint-Flow
**Datei:** `e2e-tests/loadpoint-flow.spec.ts`
**Testfälle:** zeigt Titel und Live-Leistung (`1.0 kW`); zeigt genau einen Loadpoint.
**Warum kritisch:** Validiert, dass WS-Daten vom echten Backend korrekt im Ladepunkt-Widget ankommen. Bewusst **kein** Mode-Klick (das deckt Moser E2E ab) – Fokus auf Live-Daten-Darstellung.

### E2E-2: Navigation
**Datei:** `e2e-tests/navigation-flow.spec.ts`
**Testfälle:** untere Tab-Leiste sichtbar; Wechsel zur Sessions-Ansicht.
**Warum kritisch:** Grundnavigation – bricht sie, ist die App praktisch unbedienbar.

---

## 6. Lasttest (k6)

**Datei:** `load-tests/sessions-load.js`

### Lastprofil

| Phase | Dauer | Ziel | Zweck |
|-------|-------|------|-------|
| Ramp-up | 15 s | 20 VU | Hochfahren auf Spitzenlast |
| Halten | 30 s | 20 VU | Dauerlast (mehrere Geräte/Tabs) |
| Ramp-down | 10 s | 0 VU | Sauberes Beenden |

### Thresholds (objektive Akzeptanzkriterien)

| Metrik | Schwellenwert | Begründung |
|--------|--------------|------------|
| `http_req_failed` | rate < 1 % | API-Stabilität unter Last |
| `http_req_duration` | p(95) < 500 ms | Tail-Latenz bestimmt die reale Nutzererfahrung |

### Szenario
Jeder VU ruft `GET /api/sessions` und prüft `status 200` + vorhandenes `result`. `/api/sessions` ist ein **DB-gestützter** Read (SQLite-Abfrage der Ladesessions) und prüft damit eine andere Lastdimension als ein reiner In-Memory-State. **Disjunkt zu Moser**, dessen k6-Test `/api/state` + WebSocket lastet.

**Warum k6 statt Playwright-Last:** geringer Overhead pro VU, native Metriken/Thresholds; ein Browser-Tool pro VU würde die Maschine sättigen, bevor der Server es tut. Im Projekt existierte **kein** Lasttest → größter Eigenanteil.

---

## 7. Testumgebung und Isolation

| Test-Typ | Isolationsmechanismus |
|----------|----------------------|
| Unit (Jest) | `clearMocks: true`; reine Funktionen, kein Backend, kein Netzwerk |
| Integration (Cypress CT) | Jeder `it()` mountet die Komponente frisch (`cy.mount`); kein Backend; `clearMocks` analog via frischem Mount |
| E2E (Playwright Browser) | `beforeAll` bootet evcc mit Fixture, `afterAll` stoppt; frischer Browser-Context je Test |
| Last (k6) | jeder VU unabhängig; Server manuell gestartet |

**Jest-Isolation:** eigene `jest.config.cjs` mit `testMatch: **/*.jest.ts` und `roots: [__dirname]` – greift ausschließlich auf die Dateien dieses Ordners zu, kollidiert nicht mit Vitest (`*.test.ts`) oder Playwright (`*.spec.ts`). `moduleNameMapper` löst `@/` auf `assets/js/` auf.

---

## 8. CI/CD-Integration

```yaml
jobs:
  unit-jest:
    steps:
      - run: npx jest -c WAT4/kalt/jest.config.cjs

  integration-cypress:
    steps:
      - run: npx cypress run --component --spec "WAT4/kalt/integration-tests/component/**/*.cy.ts"

  e2e-playwright:
    steps:
      - run: go build -o evcc . && ./evcc --config tests/basics.evcc.yaml &
      - run: npx playwright test WAT4/kalt/e2e-tests
```

Der Lasttest ist **nicht** für automatische CI-Ausführung vorgesehen (laufender Server + kalibrierte Umgebung nötig) und wird manuell vor Releases gefahren.

---

## 9. Testergebnisse

### Unit-Tests (verifiziert)

```
Test Suites  10 passed (10)
     Tests   34 passed (34)
  Duration   ~7s
```

Alle 34 Jest-Cases laufen grün (`npx jest -c WAT4/kalt/jest.config.cjs`).

### Integration (Cypress CT, verifiziert)
```
TariffChart.cy.ts    3 passing
DateNavigator.cy.ts  3 passing
SessionTable.cy.ts   2 passing
All specs passed!    8/8
```
Kein Backend nötig. Verifikation via `npx cypress run --component --spec "WAT4/kalt/integration-tests/component/**/*.cy.ts"`.

### E2E (Playwright, verifiziert)
4/4 grün gegen gebootetes evcc (`basics.evcc.yaml`). Verifikation via `npx playwright test WAT4/kalt/e2e-tests`.

### Lasttest (k6, verifiziert)
Gegen laufendes evcc: beide Thresholds grün (`http_req_duration` p95 ≈ 107 ms < 500 ms; `http_req_failed` 0,06 % < 1 %).

---

## 10. Abgrenzung zu Moser (Doppelabdeckungs-Check)

Die Targets wurden bewusst **disjunkt** zur Arbeit von Sebastian Moser (`WAT4/`) gewählt. Eine Body-für-Body-Prüfung **aller** Layer (nicht nur per Dateiname) ergab ursprünglich **vier** Überschneidungen – 2× Unit, 1× Load, 1× E2E. Alle wurden aufgelöst. Ergebnis der finalen Prüfung: **keine fachliche Überschneidung**.

### Aufgelöste Überschneidungen

| Layer | ursprünglich (überschnitt mit Moser) | Maßnahme | warum jetzt disjunkt |
|-------|--------------------------------------|----------|----------------------|
| Unit | `energyOptions` (`optionStep`/`estimatedSoc`) ↔ Moser UT-4 `LimitEnergySelect.vue` | ersetzt → UT-2 `forecast.adjustedSolar` (Solar-Skalierung) | Moser testet keine Solar-Forecast-Logik |
| Unit | `convertToUiLoadpoints` ↔ Moser UT-2 (`socBasedPlanning`/`socPerKwh`) | ersetzt → UT-10 `tariffSlots.generateRateSlots` (15-min-Rasterung) | Moser fasst `convertToUiLoadpoints` nicht mehr an; andere Funktion als Kalts `costRange`/`findRate` |
| Load | `state-load` `GET /api/state` ↔ Moser k6 (lastet ebenfalls `/api/state` + WS) → **Teilmenge** | retargetet → `sessions-load` `GET /api/sessions` (DB-Read) | Moser lastet `/api/sessions` nicht |
| E2E | `charge-mode-flow` (Mode-Klick → `active`-Klasse) ↔ Moser `charging-lifecycle` (gleiche Assertion) | entfernt; verbleiben 2 disjunkte E2E (Minimum erfüllt) | Mode-Klick-Flow deckt allein Moser ab |

### Layer-Abgrenzung (kein Konflikt)

| Thema | Moser (WAT4) | Kalt | Bewertung |
|-------|--------------|------|-----------|
| **Cypress Component Testing** | `Mode`, `BatteryBoostButton`, `LimitSocSelect` (Loadpoint-Bedienelemente) | `TariffChart`, `DateNavigator`, `SessionTable` (Tarif + Sessions) | **Gleiches Framework, disjunkte Komponenten/Domänen** – kein gleicher Prüfgegenstand. |
| Loadpoint-Ableitung | UT-2 **Vitest** `convertToUiLoadpoints` | UT-9 **Jest** `uiLoadpoints` Layout (`setLoadpointOrder`/Sichtbarkeit) | Gleiche Datei, **andere Funktionen** – keine Funktions-Dopplung. |
| Tarif | (keine Tarif-Komponente getestet) | UT (`convertRates`/`tariffSlots`/`forecast`) + IT (`TariffChart`) | Nur Kalt. |
| Sessions | UT-5 **Vitest** `SessionInfo.vue` (Metrik-Filter) | IT `DateNavigator`/`SessionTable` (Navigation/Tabelle) | Andere Komponenten – `SessionInfo` ≠ `DateNavigator`/`SessionTable`. |

**Überschneidungsfrei (nur Kalt):** `convertRates`, `forecast` (Lowest-Slot/Static-Tariff/Solar), `tariffSlots` (Cost-Range/Find-Rate/Generate-Slots), `ocpp`, `remote`, Loadpoint-Layout, Cypress-CT auf `TariffChart`/`DateNavigator`/`SessionTable`, Navigations-/Loadpoint-E2E, k6-Last auf `/api/sessions`.

**Hinweis zum Framework-Wechsel:** Die Integration wurde von Playwright-`request` (API) auf **Cypress Component Testing** umgestellt – damit nutzt Kalt nun dasselbe Integrations-Framework wie Moser. Die Disjunktheit bleibt gewahrt, weil **andere Komponenten** geprüft werden (Tarif/Sessions vs. Mosers Loadpoint-Bedienelemente).

**Fazit des Checks:** Keine fachliche Dopplung mit Moser – alle Layer body-geprüft. Verbleibende Berührungspunkte betreffen **unterschiedliche Komponenten/Funktionen**, nicht denselben Prüfgegenstand.

---

## 11. Fazit

Die Arbeit legt für **eine Person** das vollständige Pyramidengerüst an und übererfüllt das Mengengerüst (34/8/4/1 statt 5/3/2/1):

- **Unit (Jest)** deckt die fachlichen Kernfunktionen (Tarif, Forecast, Loadpoint-Layout) deterministisch ab – breite, schnelle Basis.
- **Integration (Cypress Component Testing)** prüft Vue-Komponenten (Tarif/Sessions) im echten Browser – DOM, CSS-Klassen, Events, ohne Backend.
- **E2E (Playwright)** validiert die kritischen User-Flows im echten Browser.
- **Load (k6)** schließt die im Projekt fehlende Qualitätsdimension „Verhalten unter Last".

Die Targets sind vollständig disjunkt zu Moser gewählt; **alle Layer wurden body-geprüft** (nicht nur per Dateiname). Vier ursprüngliche Überschneidungen (2× Unit, 1× Load, 1× E2E) wurden aufgelöst – ersetzt bzw. entfernt (siehe Abschnitt 10). Verbleibende Berührungspunkte betreffen nur unterschiedliche Test-Layer oder unterschiedliche Funktionen – keine echte Doppelabdeckung.
