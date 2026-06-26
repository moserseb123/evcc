# WAT4 Projektarbeit – Testbericht

**Modul:** WAT4 – Qualitätssicherung und Testen
**Datum:** 26. Juni 2026
**Bearbeiter:** Sebastian Moser, Sebastian Kaltenegger
**Abgabe:** 27. Juni 2026

---

## 1. Anwendungsbeschreibung

### Was ist evcc?

**evcc** (EV Charging Control) ist ein quelloffenes Energiemanagementsystem für Elektrofahrzeuge. Es steuert Wallboxen, Photovoltaikanlagen, Hausspeicher und dynamische Stromtarife so, dass Elektrofahrzeuge möglichst günstig und solar geladen werden.

Das System ist als Heimserver konzipiert und wird auf einem lokalen Rechner (Raspberry Pi, NAS o. Ä.) betrieben. Die Benutzeroberfläche läuft im Browser und kommuniziert über **WebSocket** und **REST** mit dem Backend.

### Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Vue 3.5 (Composition API + Options API), TypeScript, Bootstrap 5 |
| Build | Vite 8, Vitest 4.1, vue-tsc |
| State | Reaktiver Singleton `store.ts` – einziger WebSocket-Eintrittspunkt |
| Backend | Go (nicht Bestandteil dieser Tests) |
| Kommunikation | WebSocket (Echtzeit-State) + REST-API (Nutzeraktionen) |

### Architekturübersicht

```
Browser
  │
  ├─ WebSocket ──► store.ts (setProperty)
  │                    │
  │                    ├─ uiLoadpoints.ts  (UI-State-Ableitung)
  │                    └─ Vue-Reaktivität ─► 292 Komponenten
  │
  └─ REST-API ──► /api/loadpoints/{id}/mode/{mode}
                 /api/loadpoints/{id}/limitsoc/{soc}
                 /api/state  (initialer State)
```

---

## 2. Teststrategie

### Ausgangslage

Vor dieser Arbeit hatte das evcc-Frontend eine erhebliche **Coverage-Lücke**:

| Bereich | Umfang | Vorhandene Tests |
|---------|--------|-----------------|
| Vue-Komponenten | 292 | ~5 (< 2 %) |
| Utility-Funktionen | ~15 Dateien | ~10 Dateien |
| store.ts | kritischer Kern | **0 Tests** |
| uiLoadpoints.ts | UI-State-Zentrale | **0 Tests** |

### Framework-Auswahl

| Test-Typ | Framework | Bearbeiter | Begründung |
|----------|-----------|------------|------------|
| Unit-Tests | **Vitest** + `@vue/test-utils` | Moser | Standard im Projekt; passt zu vorhandener CI |
| Unit-Tests | **Jest** + ts-jest | Kalt | Isolierte Config, die nicht mit Vitest kollidiert |
| Integrationstests | **Cypress Component Testing** | Beide | Echtes Chromium-Rendering; testet CSS, Events und Browser-APIs ohne Backend |
| E2E-Tests | **Playwright** | Beide | Bereits im Projekt vorhanden; testet gegen echten evcc-Server |
| Lasttest | **k6** | Beide | Spezialisiert auf HTTP/WebSocket-Lastsimulation |

### Gesamtübersicht aller Tests

| Nr. | Typ | Framework | Datei | Bearbeiter | Tests |
|-----|-----|-----------|-------|------------|-------|
| UT-1 | Unit | Vitest | `unit-tests/chargingPlanWarnings.test.ts` | Moser | 9 |
| UT-2 | Unit | Jest | `kalt/unit-tests/convertRates.jest.ts` | Kalt | – |
| UT-3 | Unit | Jest | `kalt/unit-tests/forecastSolar.jest.ts` | Kalt | – |
| UT-4 | Unit | Jest | `kalt/unit-tests/forecastLowestSlot.jest.ts` | Kalt | – |
| UT-5 | Unit | Jest | `kalt/unit-tests/forecastStaticTariff.jest.ts` | Kalt | – |
| UT-6 | Unit | Jest | `kalt/unit-tests/ocpp.jest.ts` | Kalt | – |
| UT-7 | Unit | Jest | `kalt/unit-tests/remote.jest.ts` | Kalt | – |
| UT-8 | Unit | Jest | `kalt/unit-tests/tariffCostRange.jest.ts` | Kalt | – |
| UT-9 | Unit | Jest | `kalt/unit-tests/tariffFindRate.jest.ts` | Kalt | – |
| UT-10 | Unit | Jest | `kalt/unit-tests/tariffGenerateSlots.jest.ts` | Kalt | – |
| UT-11 | Unit | Jest | `kalt/unit-tests/uiLoadpoints-layout.jest.ts` | Kalt | – |
| IT-1 | Integration | Cypress CT | `integration-tests/component/BatteryBoostIntegration.cy.ts` | Moser | 4 |
| IT-2 | Integration | Cypress CT | `integration-tests/component/MinSocCharging.cy.ts` | Moser | 4 |
| IT-3 | Integration | Cypress CT | `integration-tests/component/DeparturePlan.cy.ts` | Moser | 5 |
| IT-4 | Integration | Cypress CT | `kalt/integration-tests/TariffChart.cy.ts` | Kalt | 3 |
| IT-5 | Integration | Cypress CT | `kalt/integration-tests/DateNavigator.cy.ts` | Kalt | 3 |
| IT-6 | Integration | Cypress CT | `kalt/integration-tests/SessionTable.cy.ts` | Kalt | 2 |
| E2E-1 | E2E | Playwright | `e2e-tests/charging-lifecycle.spec.ts` | Moser | 1 |
| E2E-2 | E2E | Playwright | `e2e-tests/smart-cost-flow.spec.ts` | Moser | 1 |
| E2E-3 | E2E | Playwright | `kalt/e2e-tests/charge-plan-flow.spec.ts` | Kalt | 2 |
| E2E-4 | E2E | Playwright | `kalt/e2e-tests/loadpoint-flow.spec.ts` | Kalt | 2 |
| LT-1 | Last | k6 | `load-tests/websocket-load.js` | Moser | – |
| LT-2 | Last | k6 | `kalt/load-tests/sessions-load.js` | Kalt | – |

**Gesamt: 43+ Testfälle** (9 Moser Unit + 34 Kalt Unit + 13 Moser IT + 8 Kalt IT + 2 Moser E2E + 4 Kalt E2E + 2 Lasttests)

---

---

# Teil A – Sebastian Moser

---

## A.1 Unit-Tests (Vitest)

### UT-1: `Warnings.vue` – Ladeplan-Warnungslogik

**Datei:** `WAT4/unit-tests/chargingPlanWarnings.test.ts`

**Getestete Funktionalität:** `Warnings.vue` zeigt dem Nutzer kritische Hinweise, wenn ein eingerichteter Ladeplan nicht wie erwartet funktionieren wird. Die Komponente hat fünf unabhängige `computed`-Eigenschaften, die jeweils eine konkrete Fehlerbedingung prüfen.

**Testfälle:**

1. **Baseline:** Kein Warntext wenn alle Props neutral sind (kein false positive)
2. **`targetIsAboveLimit` – SoC-Modus:** Warnung wenn Plan-SoC (90 %) über `effectiveLimitSoc` (80 %) liegt – Laden stoppt vorher
3. **`targetIsAboveLimit` – Grenzwert:** Keine Warnung wenn Plan-SoC dem Ladelimit genau entspricht
4. **`targetIsAboveLimit` – Energie-Modus:** Warnung wenn `planEnergy` (30 kWh) über `limitEnergy` (20 kWh) liegt (eigener Code-Branch)
5. **`notReachableInTime` – überschritten:** Warnung wenn geschätzte Endzeit die Zielzeit um mehr als 60 Sekunden überschreitet
6. **`notReachableInTime` – Toleranzgrenze:** Keine Warnung bei 30 Sekunden Überschreitung (innerhalb der 1-Minuten-Toleranz)
7. **`targetIsAboveVehicleLimit`:** Warnung wenn Plan-SoC (95 %) über dem Fahrzeug-eigenen Limit (80 %) liegt
8. **`targetIsAboveVehicleLimit` – kein Problem:** Keine Warnung wenn Plan-SoC (75 %) innerhalb des Fahrzeug-Limits liegt
9. **Modus-Warnung:** Hinweis wenn Lademodus `"off"` – Plan läuft nie an; kein Hinweis im `"pv"`-Modus

**Warum `Warnings.vue` und warum Unit-Test:**
Falsche Warnungen führen direkt zu unbemerkt fehlgeschlagenen Ladeplänen oder unnötiger Nutzerverwirrung. Die fünf `computed`-Eigenschaften sind vollständig durch Props gesteuert und haben keine Seiteneffekte – ideale Bedingungen für isolierte Unit-Tests ohne Browser. Besonders die `notReachableInTime`-Toleranz (60 Sekunden) ist eine nicht-offensichtliche Designentscheidung, die explizit durch einen Boundary-Test abgesichert werden muss.

---

## A.2 Integrationstests (Cypress Component Testing)

### Warum Cypress CT?

Cypress Component Testing rendert Vue-Komponenten in einem echten Chromium-Browser. Die Unit-Tests testen das berechnete Modell einer Komponente. Die Integrationstests testen wie mehrere Komponenten im echten Browser zusammenspielen – Props fließen über Komponentengrenzen, Ereignisse werden weitergeleitet und der DOM aktualisiert sich reaktiv.

Alle drei Tests verwenden `Vehicle.vue` als Elternteil, der die Daten automatisch an die richtigen Kindkomponenten verteilt.

---

### IT-1: `Vehicle` ↔ `BatteryBoostButton` ↔ `VehicleStatus` – Boost startet Ladung

**Datei:** `WAT4/integration-tests/component/BatteryBoostIntegration.cy.ts`

**Beteiligte Komponenten:**
- `Vehicle.vue` – die übergeordnete Komponente, die den Boost-Button nur anzeigt wenn das Fahrzeug verbunden ist und ein Batterielimit unter 100 % gesetzt ist. Sie empfängt den Klick des Buttons und gibt ihn nach oben weiter.
- `BatteryBoostButton.vue` – der eigentliche Button. Besonderheit: Er markiert sich beim Klick **sofort** als aktiv, noch bevor das Backend geantwortet hat. Ist der aktuelle Batterieladestand unter dem konfigurierten Limit, wird der Klick ignoriert.
- `VehicleStatus` – zeigt den aktuellen Ladestatus als Text an (z. B. „Warte auf Fahrzeug" oder „Lädt").

**Testfälle:**

1. Button ist sichtbar und nicht aktiv wenn das Fahrzeug nicht lädt
2. Klick auf Button → Button zeigt sofort aktiven Zustand + Ereignis wird weitergegeben
3. Nachdem das Backend „Laden gestartet" meldet, zeigt VehicleStatus „charging"
4. Button ist gesperrt wenn der Lademodus auf „off" steht

**Zusammenspiel:**
Getestet wird ob der Klick auf den Button korrekt durch alle drei Komponenten durchgereicht wird und ob sich die Statusanzeige danach aktualisiert. Wichtig dabei: Button und Statusanzeige kennen sich nicht – sie kommunizieren ausschließlich über `Vehicle.vue` in der Mitte.

---

### IT-2: `Vehicle` ↔ `VehicleStatus` ↔ `StatusItem` – MinSoc-Ladestart

**Datei:** `WAT4/integration-tests/component/MinSocCharging.cy.ts`

**Beteiligte Komponenten:**
- `Vehicle.vue` – übergeordnete Komponente, die den aktuellen Fahrzeugzustand (`connected`, `charging`, `minSocNotReached`) an VehicleStatus weitergibt.
- `VehicleStatus` – berechnet daraus den anzuzeigenden Statustext und welche Hinweis-Badges sichtbar sind.
- `StatusItem.vue` – rendert einen einzelnen Badge (z. B. das MinSoc-Badge mit dem Prozentwert).

**Testfälle:**

1. Kein MinSoc-Badge und Status „getrennt" wenn das Fahrzeug nicht angeschlossen ist
2. MinSoc-Badge erscheint sobald das Fahrzeug verbunden wird und der Mindestladestand noch nicht erreicht ist
3. Status wechselt zu „lädt" sobald die Ladung startet – Badge bleibt sichtbar
4. Badge verschwindet wenn der Mindestladestand erreicht ist

**Zusammenspiel:**
Getestet wird der Ablauf vom Anschließen des Fahrzeugs bis zum Erreichen des Mindestladestands. Dabei muss `Vehicle.vue` die Zustandsänderungen korrekt an `VehicleStatus` weitergeben, welches wiederum `StatusItem` die richtigen Badges anzeigen lässt.

---

### IT-3: `Vehicle` ↔ `ChargingPlan` ↔ `VehicleStatus` ↔ `StatusItem` – Abfahrtsplan

**Datei:** `WAT4/integration-tests/component/DeparturePlan.cy.ts`

**Beteiligte Komponenten:**
- `Vehicle.vue` – übergeordnete Komponente, die die Plan-Daten (Abfahrtszeit, Ziel-SoC, ob der Plan gerade aktiv ist) an zwei Kindkomponenten gleichzeitig weitergibt.
- `ChargingPlan.vue` – zeigt einen klickbaren Button mit der eingestellten Abfahrtszeit und dem Ziel-SoC an. Ohne Plan steht dort ein „kein Plan"-Platzhaltertext.
- `VehicleStatus` + `StatusItem.vue` – zeigen einen Badge an: „Plan geplant" solange das Laden noch nicht gestartet hat, danach „Plan aktiv" während des Ladevorgangs.

**Testfälle:**

1. Kein Plan gesetzt → ChargingPlan zeigt Platzhalter, kein Badge in VehicleStatus
2. Plan eingerichtet → ChargingPlan zeigt Abfahrtszeit und Ziel-SoC (80 %)
3. Plan ist noch nicht gestartet → „Plan geplant"-Badge sichtbar
4. Ladevorgang startet → Badge wechselt von „geplant" zu „aktiv", ChargingPlan-Button bleibt sichtbar
5. Klick auf den Plan-Button öffnet den Plan-Dialog

**Zusammenspiel:**
Die Besonderheit dieses Tests ist, dass eine einzige Zustandsänderung (`planActive` wird `true`) **gleichzeitig zwei verschiedene Bereiche der Oberfläche** aktualisiert: den Plan-Badge in VehicleStatus und den Plan-Button in ChargingPlan. Beide Komponenten erhalten ihre Daten unabhängig voneinander von `Vehicle.vue` – der Test stellt sicher, dass beide korrekt und gleichzeitig reagieren.

---

## A.3 End-to-End-Tests (Playwright)

Playwright-Tests laufen gegen einen echten evcc-Server mit einem dedizierten Simulator-Backend:

```
┌─────────────┐    WebSocket     ┌───────────────┐
│   Playwright │ ──────────────► │  evcc-Server  │
│   (Chromium) │ ◄────────────── │  (go run .)   │
│             │    REST-API      └───────────────┘
└─────────────┘
```

### E2E-1: Fahrzeug-Ladelifecycle

**Datei:** `WAT4/e2e-tests/charging-lifecycle.spec.ts`

Fahrzeug ist verbunden, Modus „Schnell" wird gewählt → Simulator reagiert → UI zeigt animierten Ladebalken und Status „Charging…". Dies ist die Kern-User-Journey in evcc und wird von keinem anderen Test mit echtem Backend abgedeckt.

### E2E-2: Smart-Cost-Threshold erlaubt Ladestart

**Datei:** `WAT4/e2e-tests/smart-cost-flow.spec.ts`

Preislimit ≤ 40,0 ct/kWh konfigurieren → Simulator-Tarif liegt darunter → Laden startet → UI zeigt „Charging…" und Smart-Cost-Badge mit Preis-Limit-Vergleich (`≤ 40.0 ct`). Testet den vollständigen wirtschaftlichen Kern-Use-Case für Nutzer mit dynamischen Stromtarifen.

---

## A.4 Lasttest (k6)

**Datei:** `WAT4/load-tests/websocket-load.js`

Testet die WebSocket-Verbindung unter gleichzeitiger Last von bis zu 20 virtuellen Nutzern (simulierte Browser-Tabs). Jeder Nutzer ruft `/api/state` ab und hält eine WebSocket-Verbindung für 5 Sekunden offen.

| Phase | Dauer | Ziel |
|-------|-------|------|
| Ramp-up | 20 s | 5 VU |
| Normal | 30 s | 10 VU |
| Spitze | 20 s | 20 VU |
| Ramp-down | 10 s | 0 VU |

**Thresholds:** WS-Verbindungszeit p95 < 500 ms, API-Antwortzeit p95 < 200 ms, Fehlerrate < 5 %.

evcc basiert vollständig auf WebSocket für Echtzeit-Updates – ohne funktionierende Verbindung sieht die UI veraltete Ladedaten und Nutzer können nicht eingreifen.

---

---

# Teil B – Lukas Kalt

---

## B.1 Unit-Tests (Jest)

**Framework:** Jest mit ts-jest, isolierte Config (`jest.config.cjs`), die nur `*.jest.ts`-Dateien einsammelt und damit nicht mit Vitest oder Playwright kollidiert.

Zehn Dateien mit zusammen 34 Fällen, alle aus den Bereichen Tarif-Utilities, Forecast und UI-State:

| Datei | Getestete Funktion | Warum wichtig |
|-------|-------------------|---------------|
| `convertRates.jest.ts` | Wandelt Roh-Tarifdaten in das Slot-Format des UI um | Jede Tarif- und Forecast-Anzeige baut darauf auf; ein Fehler zieht sich durch die gesamte Preisdarstellung |
| `forecastSolar.jest.ts` | `adjustedSolar` – skaliert PV-Prognose mit Kalibrierfaktor | Ein falscher Faktor verfälscht die komplette Solar-Vorhersage |
| `forecastLowestSlot.jest.ts` | `findLowestSumSlotIndex` – findet günstigstes Ladefenster | Kern des Smart-Chargings; ein Off-by-one verschiebt das Fenster und kostet Geld |
| `forecastStaticTariff.jest.ts` | `isStaticTariff` – unterscheidet statischen von dynamischem Tarif | Entscheidet ob Smart-Cost-Planung überhaupt eingeblendet wird |
| `ocpp.jest.ts` | Baut Wallbox-URL aus `externalUrl` bzw. Hostname/Port | Falsche URL macht die Wallbox unerreichbar |
| `remote.jest.ts` | `isRemoteClientActive` – Online-Erkennung über 5-Minuten-Grenze | Die Zeitgrenze ist die fehleranfällige Stelle und steuert die Online-Anzeige |
| `tariffCostRange.jest.ts` | `calculateCostRange` – ermittelt min/max-Preis | Bildet die Preis-Skala der Forecast-Anzeige; Slots ohne Wert dürfen sie nicht verzerren |
| `tariffFindRate.jest.ts` | `findRateInRange` – liefert den gerade geltenden Tarif | Grundlage jeder aktuellen Kostenanzeige |
| `tariffGenerateSlots.jest.ts` | `generateRateSlots` – rastert Tarife in 15-Minuten-Slots | Dieses Raster speist die gesamte Preis- und Lade-Markierung; eine falsche Rasterung verschiebt alle Markierungen |
| `uiLoadpoints-layout.jest.ts` | `setLoadpointOrder` – Reihenfolge und Sichtbarkeit der Loadpoints | Ein Fehler zeigt Ladepunkte in falscher Reihenfolge oder gar nicht an |

Es sind durchweg reine Funktionen mit klaren Verzweigungen und Randfällen (leeres Array, null, Zeitgrenzen, Rundung) – genau dort steckt die Aussagekraft.

---

## B.2 Integrationstests (Cypress Component Testing)

Einzelne Vue-Komponenten werden mit `cy.mount` im echten Browser gemountet und auf DOM, CSS-Klassen und Events geprüft – ohne laufendes Backend. Der i18n-Mount-Helper wird mit Mosers Setup geteilt.

### IT-4: `TariffChart` – Tarif-Balkendiagramm

Prüft, dass jedes Tarif-Fenster als Balken erscheint, das Fenster mit aktivem Laden hervorgehoben wird und teure Fenster eine Warnung bekommen. Der Nutzer soll daran ablesen können wann geladen wird und wann der Strom teuer ist – eine falsche Markierung führt zu falschen Annahmen über die Ladekosten.

### IT-5: `DateNavigator` – Datumsnavigation

Prüft, dass nicht vor den ältesten Ladesessions zurück- und nicht in die Zukunft vorwärtsnavigiert werden kann, und dass die Tageswahl den gewählten Tag nachlädt. Die Grenzen bilden den verfügbaren Datenbereich ab – ohne sie landet der Nutzer in leeren Ansichten.

### IT-6: `SessionTable` – Ladehistorie

Prüft, dass ohne Ladevorgänge ein Leer-Hinweis erscheint und je Ladevorgang eine Zeile gelistet wird. Ein Fehler bedeutet entweder einen leeren Verlauf trotz vorhandener Daten oder einen Absturz bei vorhandenen Daten.

---

## B.3 End-to-End-Tests (Playwright)

Tests laufen im echten Browser gegen ein gebootetes evcc mit eigener Fixture (`basics.evcc.yaml`). Vor jedem Test wird der Server gestartet, danach wieder gestoppt.

### E2E-3: `charge-plan-flow` – Ladeplanung öffnen

Der Nutzer öffnet über den Ladeplan-Button die Ladeplanung, das Modal erscheint und enthält die Planungsfelder für Zeit und Energiemenge. Die Ladeplanung ist der zentrale Smart-Charging-Workflow und dieser komplette Pfad – Klick, Modal, Planungs-UI – wird von keinem anderen Test abgedeckt.

### E2E-4: `loadpoint-flow` – Hauptansicht mit Live-Daten

Prüft, dass die Hauptansicht Titel, Live-Leistung (1,0 kW) und genau einen Ladepunkt zeigt. Bestätigt, dass die WebSocket-Daten vom echten Backend korrekt im Ladepunkt-Widget ankommen.

---

## B.4 Lasttest (k6)

**Datei:** `WAT4/kalt/load-tests/sessions-load.js`

Testet den Endpoint `/api/sessions`, der die Ladesessions aus SQLite liest. Ein DB-gestützter Read zeigt ein anderes Lastverhalten als ein reiner In-Memory-State.

**Lastprofil:** 15 Sekunden hoch auf 20 virtuelle Nutzer, 30 Sekunden halten, 10 Sekunden runter. Jeder Nutzer ruft `/api/sessions` ab und prüft Status 200 und dass die Antwort ein Array ist.

**Thresholds:** 95-Perzentil-Antwortzeit < 500 ms, Fehlerrate < 1 %. Das Perzentil statt eines Mittelwerts, weil die Tail-Latenz die tatsächliche Nutzererfahrung bestimmt.

---

---

# Gemeinsame Abschnitte

---

## C.1 Testumgebung und Isolation

### Testausführung

```bash
# Unit-Tests Moser (Vitest)
npm run test -- --run WAT4

# Unit-Tests Kalt (Jest)
npx jest --config WAT4/kalt/jest.config.cjs

# Integrationstests (Cypress CT) – kein Backend nötig
npm run test:cypress        # CI-Modus
npm run test:cypress:open   # Interaktiver Browser-Modus

# E2E-Tests (Playwright) – erfordert laufenden evcc-Server
go run . --config tests/simulator.evcc.yaml &
npx playwright test WAT4/e2e-tests/
npx playwright test WAT4/kalt/e2e-tests/

# Lasttests (k6)
npm run test:load
k6 run WAT4/kalt/load-tests/sessions-load.js
```

### Testisolation

| Test-Typ | Isolationsmechanismus |
|----------|----------------------|
| Unit Vitest | Jeder Test mountet die Komponente frisch; kein globaler State; kein Backend |
| Unit Jest | Reine Funktionen, kein Backend; `clearMocks` zwischen den Fällen; eigene Config kollidiert nicht mit Vitest |
| Integration (Cypress CT) | Jeder `it()`-Block mountet Komponente neu; Stubs für nicht relevante Sub-Komponenten |
| E2E (Playwright) | `beforeEach` startet frischen Server; `afterEach` stoppt ihn; jeder Test bekommt eigenen Browser-Context |
| Lasttest (k6) | Jeder VU ist unabhängig; Server wird manuell gestartet |

### Mock-Strategie

- **i18n**: `$t`, `$te`, `$i18n` werden in allen Tests gemockt – wird von beiden Bearbeitern über denselben Cypress-Mount-Helper geteilt
- **Sub-Komponenten**: `VehicleSoc`, `ChargingPlan` (in IT-1/IT-2) werden gestubbt, um Tests auf die relevante Komponentenkette zu fokussieren
- **Backend**: Unit- und Integrationstests benötigen kein laufendes Backend

---

## C.2 CI/CD-Integration

```yaml
# Beispiel: GitHub Actions
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test          # Vitest (Moser)
      - run: npx jest --config WAT4/kalt/jest.config.cjs  # Jest (Kalt)

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:cypress

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: go build -o evcc . && ./evcc --config tests/simulator.evcc.yaml &
      - run: npx playwright test WAT4/e2e-tests/ WAT4/kalt/e2e-tests/
```

Lasttests sind nicht für automatische CI-Ausführung vorgesehen, da sie einen laufenden Server und eine kalibrierte Umgebung voraussetzen.

---

## C.3 Fazit

Die implementierten Tests decken drei qualitativ unterschiedliche Ebenen ab:

**Unit-Ebene:** Moser testet die Ladeplan-Warnungslogik mit 9 Boundary-Tests direkt an der Komponente. Kalt testet 10 Utility-Funktionen (Tarif-Slots, Forecast, Smart-Charging-Kern) mit 34 Fällen als reine Funktionen ohne Browser. Zusammen decken beide die kritischsten Berechnungen der Anwendung ab.

**Integrationsebene:** Beide nutzen Cypress CT, testen aber unterschiedliche Bereiche. Moser prüft das Zusammenspiel rund um `Vehicle.vue` (Boost-Button, MinSoc, Abfahrtsplan). Kalt prüft die Darstellungskomponenten für Tarife und Sessions (TariffChart, DateNavigator, SessionTable).

**E2E-Ebene:** Mosers Tests decken den Ladestart-Flow und Smart-Cost ab. Kalts Tests decken die Ladeplanung und die Live-Daten-Anzeige ab. Zusammen ergibt sich eine breite Abdeckung der wichtigsten User-Journeys.

Die Auswahl der Testbereiche folgte dem Kriterium des **höchsten Schadenspotenzials bei einem Bug**: Bereiche, in denen ein einzelner Fehler entweder alle Nutzer betrifft oder direkte wirtschaftliche Konsequenzen hat, wurden bevorzugt getestet.

---

## C.4 KI-Werkzeuge

Bei der Ausarbeitung dieser Projektarbeit wurde **Claude Sonnet 4.6** (Anthropic) als KI-Assistent eingesetzt. Das KI-Werkzeug unterstützte bei der Analyse der Komponentenarchitektur, dem Entwurf der Testfälle und der Implementierung der Testdateien. Alle Tests wurden anschließend manuell verifiziert und bei Bedarf korrigiert.
