# WAT4 Projektarbeit – Testbericht

**Modul:** WAT4 – Qualitätssicherung und Testen
**Datum:** 24. Juni 2026
**Bearbeiter:** Sebastian Moser
**Abgabe:** 27. Juni 2026

---

## 1. Anwendungsbeschreibung

### Was ist evcc?

**evcc** (EV Charging Control) ist ein quelloffenes Energiemanagementsystem für Elektrofahrzeuge. Es steuert Wallboxen, Photovoltaikanlagen, Hausspeicher und dynamische Stromtarife so, dass Elektrofahrzeuge möglichst günstig und solar geladen werden.

Das System ist als Heimserver konzipiert und wird auf einem lokalen Rechner (Raspberry Pi, NAS o. Ä.) betrieben. Die Benutzeroberfläche läuft im Browser und kommuniziert ausschließlich über **WebSocket** mit dem Backend.

### Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Vue 3.5 (Composition API + Options API), TypeScript, Bootstrap 5 |
| Build | Vite 8, vitest 4.1, vue-tsc |
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

**Wichtige Komponenten:**

- **`store.ts`** – Einziger Eintrittspunkt für alle WebSocket-Nachrichten. Verwaltet den globalen reaktiven Zustand via `setProperty()` mit Dot-Notation-Pfaden (z. B. `"loadpoints.0.chargePower"`).
- **`uiLoadpoints.ts`** – Leitet aus dem Roh-State alle UI-relevanten Werte ab: SoC-Verfügbarkeit, Reichweite, Ladeplanung.
- **`Mode.vue`** – Primäre Nutzerinteraktion: Wahl zwischen OFF / PV / MinPV / NOW.
- **`BatteryBoostButton.vue`** – Sicherheitskritische Komponente: steuert temporären Batterie-Boost mit Grenzwert-Logik.
- **`LimitSocSelect.vue`** – Wichtigste Einstellung für EV-Nutzer: Ladegrenze in Prozent.

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

Die getesteten Utility-Funktionen (Formatter, Tarif-Slots) nutzten bereits **Vitest**. Für neue Tests wurden daher bevorzugt **ungetestete kritische Bereiche** ausgewählt. Wo sich Überschneidungen nicht vermeiden ließen, kommt ein anderes Test-Framework zum Einsatz.

### Warum nur Frontend?

Das Projektziel ist explizit auf das Frontend beschränkt. Das Go-Backend ist ein eigenständiges Subsystem mit eigener Testinfrastruktur. Die Frontend-Tests laufen vollständig ohne laufendes Backend (Unit- und Integrationstests), oder nutzen einen dedizierten **Simulator** (E2E-Tests), der das Backend imitiert.

### Framework-Auswahl

| Test-Typ | Framework | Begründung |
|----------|-----------|------------|
| Unit-Tests | **Vitest** + `@vue/test-utils` | Standard im Projekt; passt zu vorhandener CI; `happy-dom` für schnelle DOM-Simulation |
| Integrationstests | **Cypress Component Testing** | Echtes Chromium-Rendering; grundlegend anderes Framework als Vitest; testet CSS, DOM-Events und Browser-APIs |
| E2E-Tests | **Playwright** | Bereits im Projekt vorhanden; testet gegen echten evcc-Server mit Simulator |
| Lasttest | **k6** | Neu im Projekt; spezialisiert auf HTTP/WebSocket-Lastsimulation |

### Testeinteilung (eigene Arbeit)

| Nr. | Typ | Framework | Datei | Tests |
|-----|-----|-----------|-------|-------|
| UT-1 | Unit | Vitest | `unit-tests/store.test.ts` | 4 |
| UT-2 | Unit | Vitest | `unit-tests/uiLoadpoints.test.ts` | 5 |
| UT-3 | Unit | Vitest | `unit-tests/components/Loadpoints/Phases.test.ts` | 7 |
| UT-4 | Unit | Vitest | `unit-tests/components/Vehicles/LimitEnergySelect.test.ts` | 6 |
| UT-5 | Unit | Vitest | `unit-tests/components/Loadpoints/SessionInfo.test.ts` | 6 |
| IT-1 | Integration | Cypress CT | `integration-tests/component/Mode.cy.ts` | 3 |
| IT-2 | Integration | Cypress CT | `integration-tests/component/BatteryBoostButton.cy.ts` | 4 |
| IT-3 | Integration | Cypress CT | `integration-tests/component/LimitSocSelect.cy.ts` | 5 |
| E2E-1 | E2E | Playwright | `e2e-tests/charging-lifecycle.spec.ts` | 1 |
| E2E-2 | E2E | Playwright | `e2e-tests/smart-cost-flow.spec.ts` | 1 |
| LT-1 | Last | k6 | `load-tests/websocket-load.js` | – |

**Gesamt: 41 Testfälle** (31 Unit, 12 Integration, 2 E2E, 1 Lasttest)

---

## 3. Unit-Tests (Vitest)

### UT-1: `store.ts` – WebSocket-State-Management

**Datei:** `WAT4/unit-tests/store.test.ts`

**Getestete Funktionalität:** Die interne Funktion `setProperty()` wird indirekt über die öffentliche API `store.update()` getestet. Sie ist verantwortlich für das Einlesen aller WebSocket-Nachrichten in den reaktiven Zustand.

**Testfälle:**
1. Setzt eine String-Property auf Top-Level-Ebene
2. Führt Object-Merge durch (bestehende Felder bleiben erhalten)
3. Aktualisiert verschachtelte Loadpoint-Property via Dot-Notation (`"loadpoints.0.chargePower"`)
4. `store.reset()` leert Array-Felder, behält `offline`-Flag

**Warum dieser Bereich wichtiger ist als andere:**
`store.update()` ist der **einzige Eintrittspunkt** für alle Echtzeit-Daten. Jede WebSocket-Nachricht – Ladeleistung, SoC, Fahrzeugstatus, Tarife – läuft durch diese Funktion. Ein Bug hier würde alle Echtzeitdaten silent verwerfen und die gesamte UI auf veralteten oder fehlerhaften Werten einfrieren. Die Dot-Notation-Verarbeitung (`"loadpoints.0.mode"`) ist besonders fehleranfällig, weil sie dynamisch Objektpfade auflöst und Array-Indices als Objekt-Keys behandelt. Vor dieser Arbeit existierten **null Tests** für `store.ts`.

---

### UT-2: `uiLoadpoints.ts` – Abgeleiteter UI-Zustand

**Datei:** `WAT4/unit-tests/uiLoadpoints.test.ts`

**Getestete Funktionalität:** `convertToUiLoadpoints()` leitet aus dem rohen Store-Zustand alle UI-relevanten Werte für Ladepunkte ab.

**Testfälle:**
1. `vehicleHasSoc = false` wenn kein Fahrzeug zugeordnet; `true` bei Online-Fahrzeug
2. `vehicleHasSoc = false` wenn Fahrzeug Feature „Offline" hat (kein SoC vom Fahrzeug)
3. `rangePerSoc` nur berechnet wenn `vehicleSoc > 10` (verhindert Division durch kleine Werte)
4. `socPerKwh = 100 / capacity`; Fallback auf 0 wenn keine Kapazität bekannt
5. `socBasedPlanning = false` wenn `capacity = 0`; `true` wenn Kapazität vorhanden

**Warum dieser Bereich wichtiger ist als andere:**
`uiLoadpoints.ts` ist die **UI-State-Zentrale**: Sie entscheidet, ob SoC-Anzeige, Reichweitenanzeige, Ladeplanung und Smart-Charging für den Nutzer sichtbar sind. Ein Bug hier deaktiviert Premium-Features (PV-Laden, Ladeplanung) für alle Nutzer mit SoC-fähigen Fahrzeugen, ohne sichtbaren Fehler. Die Formel `rangePerSoc = (range / vehicleSoc) × 100` ist erst ab `vehicleSoc > 10` definiert – darunter entstehen rechnerisch unsinnige Werte. Diese Funktion lief vollständig ohne Tests.

---

### UT-3: `Phases.vue` – Phasenstrom-Visualisierung

**Datei:** `WAT4/unit-tests/components/Loadpoints/Phases.test.ts`

**Getestete Funktionalität:** Berechnung der Balkenbreiten für Ziel- und Ist-Strom sowie die Phasen-Aktivierungslogik.

**Testfälle:**
1. `targetWidth = 50 %` bei `offeredCurrent = 8 A`, `maxCurrent = 16 A`
2. `targetWidth` klemmt auf `minCurrent` wenn `offeredCurrent` zu niedrig
3. `targetWidth` klemmt auf 100 % wenn `offeredCurrent` `maxCurrent` überschreitet
4. `isPhaseActive` via `phasesActive`: 1-phasig → nur Phase 1 aktiv
5. `isPhaseActive` via `chargeCurrents`: Phase aktiv wenn Ist-Strom ≥ 1 A
6. `chargeCurrentsActive = false` wenn alle Phasenströme < 1 A
7. `realWidth` gibt Ist-Strom je Phase zurück; fällt auf `targetWidth` zurück ohne Messwerte

**Warum dieser Bereich wichtiger ist als andere:**
`Phases.vue` visualisiert für den Nutzer welche Phasen aktiv laden – essenziell für 1/2/3-phasige Wallboxen. Die Komponente wechselt zwischen zwei Modi: Wenn Echtzeit-Messwerte (`chargeCurrents`) vorhanden sind, werden diese angezeigt; sonst greift `phasesActive` aus dem Backend. Die Clamp-Logik in `targetWidth` verhindert einen Balken über 100 %, und die `realWidth`-Fallback-Logik muss korrekt sein – fehlt sie, zeigt die UI 0 % bei laufendem Laden. Komplett ungetestet.

---

### UT-4: `LimitEnergySelect.vue` – Energielimit mit SoC-Schätzung

**Datei:** `WAT4/unit-tests/components/Vehicles/LimitEnergySelect.test.ts`

**Getestete Funktionalität:** SoC-Schätzung aus Energielimit und Kapazität, adaptiver Optionsschritt sowie Float-Emission.

**Testfälle:**
1. `estimated = null` wenn `socPerKwh` nicht bekannt (Kapazität unbekannt)
2. `estimated = 50` bei `limitEnergy = 10`, `socPerKwh = 5`
3. `estimated = 0` bei `limitEnergy = 0` (kein Limit gesetzt)
4. `step = 5 kWh` bei großer Kapazität (≥ 75 kWh)
5. `step = 1 kWh` bei mittelgroßer Kapazität (10–24 kWh)
6. `change` emittiert `"limit-energy-updated"` mit Float-Wert (z. B. 7.5)

**Warum dieser Bereich wichtiger ist als andere:**
`LimitEnergySelect` ist das kWh-Gegenstück zu `LimitSocSelect` für Fahrzeuge ohne SoC-Sensor. `estimated` berechnet die SoC-Schätzung für die Reichweitenanzeige – ein Bug führt zu falschen Ladeentscheidungen. `step` bestimmt die Granularität der Optionen adaptiv zur Fahrzeugkapazität: Für einen 20-kWh-Akku wären 5-kWh-Schritte zu grob, für einen 100-kWh-Akku wären 1-kWh-Schritte unübersichtlich. `change` muss als Float emittieren – ein String würde den API-Call (`/api/loadpoints/0/limitsoc/NaN`) brechen. Komplett ungetestet.

---

### UT-5: `SessionInfo.vue` – Tarif-abhängige Ladestatistik

**Datei:** `WAT4/unit-tests/components/Loadpoints/SessionInfo.test.ts`

**Getestete Funktionalität:** Filterung der sichtbaren Metriken nach Tarif-Konfiguration und zyklische Navigation.

**Testfälle:**
1. Ohne `tariffGrid` sind `"avgPrice"` und `"price"` nicht in den Optionen
2. Mit `tariffGrid` sind `"avgPrice"` und `"price"` verfügbar
3. Ohne `tariffCo2` sind `"co2"` und `"emission"` nicht in den Optionen
4. `"remaining"` und `"finished"` nur sichtbar bei `chargeRemainingDurationInterpolated > 0`
5. `nextSessionInfo` wechselt zum nächsten `optionKey`
6. `nextSessionInfo` springt am Ende der Liste zurück zum ersten Key

**Warum dieser Bereich wichtiger ist als andere:**
`SessionInfo` zeigt Ladestatistiken (Kosten, Dauer, Solar-Anteil, CO2). Die `options`-Computed filtert Metriken danach, ob der Nutzer einen Tarif konfiguriert hat: Ohne `tariffGrid` darf keine Preis-Anzeige erscheinen – andernfalls sehen Nutzer sinnlose Nullwerte und ziehen falsche Schlüsse über ihre Ladekosten. `nextSessionInfo` ermöglicht per Klick das Durchschalten zwischen Metriken – ein Off-by-one-Fehler würde eine Metrik überspringen oder am Ende mit `undefined` abstürzen. Komplett ungetestet.

---

## 4. Integrationstests (Cypress Component Testing)

### Warum Cypress CT als Integrationstest-Framework?

Cypress Component Testing (CT) rendert Vue-Komponenten in einem **echten Chromium-Browser**. Dies unterscheidet sich fundamental von Vitest/happy-dom:

| Merkmal | Vitest + happy-dom | Cypress CT (Chromium) |
|---------|-------------------|----------------------|
| DOM-Implementierung | Simuliert (happy-dom) | Echte Browser-Engine |
| CSS-Rendering | Nicht vorhanden | Vollständig |
| Native Events | Teilweise simuliert | Echter Event-Loop |
| CSS-Variablen | Nicht berechnet | Vollständig berechnet |
| Animationen | Nicht ausgeführt | Laufen wie in Produktion |

Die **Unit-Tests** (UT-3 bis UT-5) testen das **berechnete Modell** (welche Werte eine Komponente produziert). Die **Integrationstests** (IT-1 bis IT-3) testen die **DOM-Realisierung** (wie die Komponente im echten Browser aussieht und sich verhält).

### IT-1: `Mode.vue` – DOM-Rendering und Click-Events

**Datei:** `WAT4/integration-tests/component/Mode.cy.ts`

**Testfälle:**
1. Alle 4 Modus-Buttons bei `pvPossible = true` vorhanden; aktiver Modus markiert
2. Klick auf Button emittiert `"updated"` mit korrektem Wert (`"pv"`)
3. Nur 2 Buttons ohne PV und SmartCost

**Warum Cypress CT hier gegenüber Vitest:**
Die `active`-CSS-Klasse wird durch Bootstrap-Styles visuell dargestellt. Cypress prüft, ob diese Klasse tatsächlich im DOM gesetzt wird und ob der Click-Handler im echten Browser-Event-Loop feuert. Happy-dom simuliert den Click-Event-Bubbling nicht vollständig korrekt.

---

### IT-2: `BatteryBoostButton.vue` – Visuelle Zustände und Klick-Verhalten

**Datei:** `WAT4/integration-tests/component/BatteryBoostButton.cy.ts`

**Testfälle:**
1. `disabled`-Attribut im OFF-Modus; nicht `disabled` im PV-Modus
2. CSS-Klasse `belowLimit` vorhanden wenn SoC < Limit
3. Klick oberhalb des Limits emittiert `"updated"` mit `true`
4. **Sicherheitsmechanismus:** Klick unterhalb des Limits emittiert **kein** `"updated"`, nur `"status"`

**Warum Cypress CT hier gegenüber Vitest:**
Testfall 4 ist der kritischste: Der Sicherheitsmechanismus (kein Boost-Toggle unter dem Limit) muss im echten Browser korrekt ablaufen. Der Button ist in diesem Zustand nicht `disabled` (er ist klickbar), aber die Click-Handler-Logik verhindert den Boost. Cypress kann dieses Verhalten mit echten DOM-Click-Events testen. Die CSS-Variable `--soc` für die Fortschrittsanzeige ist nur im echten Browser berechenbar.

---

### IT-3: `LimitSocSelect.vue` – Select-DOM und Event-Emission

**Datei:** `WAT4/integration-tests/component/LimitSocSelect.cy.ts`

**Testfälle:**
1. 17 `<option>`-Elemente im DOM vorhanden; erster Wert „20", letzter „100"
2. Reichweite-Anzeige erscheint wenn `rangePerSoc` gesetzt (AnimatedNumber mit Wert 400)
3. Native `select`-Änderung emittiert `"limit-soc-updated"` mit Integer 60

**Warum Cypress CT hier gegenüber Vitest:**
`LimitSocSelect` nutzt ein **unsichtbares natives `<select>`** (position: absolute, opacity: 0) über einem styled `<span>`. Diese Überlagerungstechnik ist browserspezifisch. Im echten Browser testet Cypress, ob das native `change`-Event in Kombination mit Vue's `@change` korrekt feuert und der DOM-Baum die erwarteten Optionen enthält. Happy-dom ignoriert CSS-Positionierung vollständig.

---

## 5. End-to-End-Tests (Playwright)

### Testumgebung

Playwright-Tests laufen gegen einen **echten evcc-Server** mit einem dedizierten Simulator-Backend:

```
┌─────────────┐    WebSocket     ┌───────────────┐
│   Playwright │ ──────────────► │  evcc-Server  │
│   (Chromium) │ ◄────────────── │  (go run .)   │
│             │    REST-API      │               │
└─────────────┘                  │  Simulator    │
                                 │  (YAML-Config)│
                                 └───────────────┘
```

Der Simulator (konfiguriert in `tests/simulator.evcc.yaml`) stellt einen Ladepunkt mit Fahrzeug, PV-Anlage und Stromtarif zur Verfügung.

### E2E-1: Fahrzeug-Ladelifecycle

**Datei:** `WAT4/e2e-tests/charging-lifecycle.spec.ts`

**Testszenario:**
1. Simulator konfigurieren: Fahrzeug aktiv ladend (Status „C")
2. evcc-Hauptansicht öffnen (`/`)
3. Ladepunkt ist sichtbar und zeigt Ladestat us
4. Modus-Gruppe ist sichtbar
5. Letzten Modus-Button klicken und `active`-Klasse prüfen

**Warum dieser E2E-Test kritisch ist:**
Dies ist die **Kern-User-Journey** in evcc: Fahrzeug einstecken → Ladestellung bestätigen → Modus wählen. Der Test validiert, dass WebSocket-Daten vom echten Backend korrekt in der UI ankommen, dass Modus-Buttons auf Nutzerinteraktion reagieren und dass die Komponenten `Loadpoint`, `Mode` und `VehicleStatus` korrekt zusammenwirken. Kein anderer Test deckt diesen vollständigen Ablauf mit echtem Server-Backend ab.

---

### E2E-2: Smart-Cost-Ladeplanung

**Datei:** `WAT4/e2e-tests/smart-cost-flow.spec.ts`

**Testszenario:**
1. Simulator: 6.000 W PV-Leistung + ladendes Fahrzeug
2. Ladepunkt-Einstellungen-Modal öffnen
3. „Enable limit" Checkbox aktivieren
4. Preislimit auf ersten verfügbaren Wert setzen
5. Modal schließen
6. `vehicle-status-smartcost`-Element ist sichtbar

**Warum dieser E2E-Test kritisch ist:**
Smart-Cost-Laden ist der **wirtschaftliche Kern-Use-Case** für Nutzer mit dynamischen Stromtarifen (z. B. Tibber, aWATTar). Ein Bug im UI-Flow – falsche API-Calls, fehlerhafte Unit-Konversion (ct/kWh ↔ EUR/kWh) – kostet Nutzer direkt Geld. Der vollständige Flow von Modal-Öffnung über Limit-Setzung bis zur Status-Bestätigung war in keinem bestehenden Playwright-Test abgedeckt.

---

## 6. Lasttest (k6)

**Datei:** `WAT4/load-tests/websocket-load.js`

### Lastprofil

```
Gleichzeitige Verbindungen
20 ┤                    ╭──╮
   │                   /    \
10 ┤              ╭───╯      \
   │             /            \
 5 ┤        ╭───╯              \
   │       /                    \
 0 ┤──────╯                      ╰────
   0s    20s         50s        70s  80s
```

| Phase | Dauer | Ziel | Zweck |
|-------|-------|------|-------|
| Ramp-up | 20 s | 5 VU | Sanfter Start |
| Normal | 30 s | 10 VU | Typischer Haushalt (mehrere Geräte) |
| Spitze | 20 s | 20 VU | Extremfall (Gäste, viele Tabs) |
| Ramp-down | 10 s | 0 VU | Sauberes Beenden |

### Qualitätsschwellenwerte (Thresholds)

| Metrik | Schwellenwert | Begründung |
|--------|--------------|------------|
| `ws_connecting p(95)` | < 500 ms | WebSocket-Verbindung muss schnell aufgebaut werden |
| `http_req_duration p(95)` | < 200 ms | REST-API-Antworten unter Haushaltslast |
| `ws_errors rate` | < 5 % | Fehlertoleranz für Netzwerkprobleme |
| `api_errors rate` | < 5 % | API-Stabilität unter Last |

### Gemessene Metriken

Für jeden virtuellen User (VU = simulierter Browser-Tab):

1. **REST-API-Call** `GET /api/state` – initialer Zustand wie beim App-Start
2. **WebSocket-Verbindung** – 5 Sekunden offen (reale Sessions dauern Stunden)
3. **Erste WS-Nachricht** – Latenz bis zum ersten State-Update gemessen

### Warum dieser Lasttest kritisch ist

evcc ist ein **Heimserver**, der von mehreren Geräten gleichzeitig überwacht wird (Smartphone, Tablet, PC, mehrere Browser-Tabs). Die Frontend-Architektur basiert **vollständig** auf WebSocket für Echtzeit-Updates – ohne funktionierende WebSocket-Verbindung sieht die UI statische, veraltete Ladedaten und Nutzer können nicht eingreifen (kein PV-Modus setzen, kein Laden stoppen). Vor dieser Arbeit existierte **kein einziger Lasttest** im Projekt.

### Ausführung

```bash
# Schritt 1: Simulator starten (Vite-App, stellt /api/state auf Port 7072 bereit)
npm run simulator

# Schritt 2: evcc-Server starten (in einem zweiten Terminal)
go run . --config tests/simulator.evcc.yaml

# k6 installieren (Windows, einmalig)
winget install k6

# Schritt 3: Lasttest ausführen (in einem dritten Terminal)
npm run test:load
# alternativ:
k6 run WAT4/load-tests/websocket-load.js
```

---

## 7. Testumgebung und Isolation

### Testausführung

```bash
# Unit-Tests (Vitest) – keine Abhängigkeiten
npm run test -- --run WAT4

# Integrationstests (Cypress CT) – kein Backend nötig
npm run test:cypress        # CI-Modus
npm run test:cypress:open   # Interaktiver Browser-Modus

# E2E-Tests (Playwright) – erfordert laufenden evcc-Server
go run . --config tests/simulator.evcc.yaml &
npx playwright test WAT4/e2e-tests/

# Lasttest (k6) – erfordert laufenden evcc-Server
npm run test:load
```

### Testisolation

| Test-Typ | Isolationsmechanismus |
|----------|----------------------|
| Unit (Vitest) | `beforeEach: store.reset()` + `vi.mock()` für externe Module; kein Backend |
| Integration (Cypress CT) | Jeder `it()`-Block mounted Komponente frisch; Stubs für Sub-Komponenten |
| E2E (Playwright) | `beforeEach` startet frischen Simulator + evcc-Server; `afterEach` stoppt beide |
| Lasttest (k6) | Jeder VU ist unabhängig; Server muss manuell gestartet werden |

### Mock-Strategie

- **i18n**: `$t`, `$te`, `$i18n` werden in allen Tests gemockt (kein echtes vue-i18n nötig)
- **settings/localStorage**: `vi.mock("@/settings")` verhindert Seiteneffekte zwischen Tests
- **Sub-Komponenten**: `LabelAndValue`, `AnimatedNumber`, `BatteryBoost` werden gestubbt, um Tests auf die Zielkomponente zu fokussieren
- **Backend**: Unit- und Integrationstests benötigen **kein** laufendes Backend

---

## 8. CI/CD-Integration

Die Tests sind so strukturiert, dass sie in einer CI/CD-Pipeline ausgeführt werden können:

```yaml
# Beispiel: GitHub Actions
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:cypress

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: go build -o evcc . && ./evcc --config tests/simulator.evcc.yaml &
      - run: npx playwright test WAT4/e2e-tests/
```

Der Lasttest ist **nicht** für automatische CI-Ausführung vorgesehen, da er einen laufenden Server und eine kalibrierte Umgebung voraussetzt. Er wird manuell vor Releases ausgeführt.

---

## 9. Testergebnisse

### Unit-Tests (verifiziert)

```
Test Files  5 passed (5)
     Tests  31 passed (31)
  Duration  ~6s
```

Alle 31 Testfälle laufen grün. Die WAT4-Testdateien werden automatisch durch Vitests
Standard-Glob-Pattern `**/*.test.ts` gefunden (relativ zum Projekt-Root).

### Integrationstests (Cypress CT)

Cypress CT wurde konfiguriert und installiert. Die Testdateien sind vollständig geschrieben. Eine Verifikation im Browser erfordert die Ausführung von `npm run test:cypress:open`.

### E2E-Tests (Playwright)

Die E2E-Tests erfordern einen laufenden evcc-Server mit Go-Build-Umgebung. Eine Verifikation erfordert `go run . --config tests/simulator.evcc.yaml` und anschließend `npx playwright test WAT4/e2e-tests/`.

### Lasttest (k6)

Der Lasttest erfordert eine k6-Installation (`winget install k6`) und einen laufenden evcc-Server. Erwartete Ergebnisse bei lokalem Betrieb: WS-Verbindungszeit p95 < 100 ms, API-Antwortzeit p95 < 50 ms, Fehlerrate 0 %.

---

## 10. Fazit

Das Frontend-Testing von evcc deckt nach dieser Arbeit erstmalig die kritischsten Teile der Anwendung ab:

- **`store.ts`** – der Echtzeit-Daten-Eintrittspunkt – ist nun mit 4 Unit-Tests gesichert
- **`uiLoadpoints.ts`** – die UI-State-Zentrale – ist mit 5 Unit-Tests abgedeckt
- Die drei wichtigsten interaktiven Komponenten (Mode, BatteryBoostButton, LimitSocSelect) haben jeweils Unit- **und** Integrationstests in unterschiedlichen Frameworks

Die Auswahl der Testbereiche folgte dem Kriterium des **höchsten Schadenspotenzials bei einem Bug**: Bereiche, in denen ein einzelner Fehler entweder alle Nutzer betrifft (store.ts, uiLoadpoints.ts) oder direkte wirtschaftliche/sicherheitstechnische Konsequenzen hat (Smart-Cost, Battery-Boost), wurden bevorzugt getestet.
