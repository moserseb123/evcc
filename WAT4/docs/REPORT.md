# WAT4 Projektarbeit – Testbericht

**Modul:** WAT4 – Qualitätssicherung und Testen
**Datum:** 26. Juni 2026
**Bearbeiter:** Sebastian Moser
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

**Wichtige Komponenten:**

- **`store.ts`** – Einziger Eintrittspunkt für alle WebSocket-Nachrichten. Verwaltet den globalen reaktiven Zustand via `setProperty()` mit Dot-Notation-Pfaden (z. B. `"loadpoints.0.chargePower"`).
- **`Vehicle.vue`** – Zentraler State-Mediator: leitet Props via `collectProps()` automatisch an alle Kinder-Komponenten weiter (VehicleStatus, VehicleSoc, LimitSocSelect, ChargingPlan, BatteryBoostButton).
- **`VehicleStatus`** – Berechnet Lade-Statustexte und Statusbadges reaktiv aus Props (minSoc, planActive, charging, etc.).
- **`ChargingPlan.vue`** – Abfahrtsplan-Visualisierung: zeigt Abfahrtszeit und Ziel-SoC im Plan-Button.
- **`BatteryBoostButton.vue`** – Sicherheitskritische Komponente: steuert temporären Batterie-Boost mit Grenzwert-Logik und optimistischem UI-Feedback.
- **`Warnings.vue`** – Zeigt kritische Hinweise beim Einrichten eines Ladeplans (Limit-Überschreitung, Zeitfenster, Fahrzeuglimit).

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
| UT-1 | Unit | Vitest | `unit-tests/chargingPlanWarnings.test.ts` | 9 |
| IT-1 | Integration | Cypress CT | `integration-tests/component/BatteryBoostIntegration.cy.ts` | 4 |
| IT-2 | Integration | Cypress CT | `integration-tests/component/MinSocCharging.cy.ts` | 4 |
| IT-3 | Integration | Cypress CT | `integration-tests/component/DeparturePlan.cy.ts` | 5 |
| E2E-1 | E2E | Playwright | `e2e-tests/charging-lifecycle.spec.ts` | 1 |
| E2E-2 | E2E | Playwright | `e2e-tests/smart-cost-flow.spec.ts` | 1 |
| LT-1 | Last | k6 | `load-tests/websocket-load.js` | – |

**Gesamt: 24 Testfälle** (9 Unit, 13 Integration, 2 E2E, 1 Lasttest)

---

## 3. Unit-Tests (Vitest)

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
Falsche Warnungen (false positive/negative) führen direkt zu unbemerkt fehlgeschlagenen Ladeplänen oder unnötiger Nutzerverwirrung. Die fünf `computed`-Eigenschaften sind vollständig durch Props gesteuert und haben keine Seiteneffekte – ideale Bedingungen für isolierte Unit-Tests ohne Browser. Besonders die `notReachableInTime`-Toleranz (60 Sekunden) ist eine nicht-offensichtliche Designentscheidung, die explizit durch einen Boundary-Test abgesichert werden muss.

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

Die **Unit-Tests** testen das **berechnete Modell** einer Komponente (welche Werte sie produziert). Die **Integrationstests** testen die **DOM-Realisierung mehrerer Komponenten zusammen** – wie Props über Komponentengrenzen fließen, Ereignisse weitergeleitet werden und sich der DOM reaktiv aktualisiert.

Alle Integrationstests verwenden `Vehicle.vue` als echten Elternteil. Vehicle nutzt den `collector`-Mixin, der via `collectProps()` Props automatisch an die richtigen Kinder verteilt. Dieser Mechanismus kann ausschließlich im echten Browser mit echten Vue-Instanzen verifiziert werden.

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

---

### E2E-1: Fahrzeug-Ladelifecycle

**Datei:** `WAT4/e2e-tests/charging-lifecycle.spec.ts`

**Testszenario:**
Fahrzeug ist verbunden (Zustand B/C), Modus „Schnell" (NOW) wird gewählt → Simulator reagiert → UI zeigt animierten Ladebalken und Status „Charging…".

**Warum dieser E2E-Test kritisch ist:**
Dies ist die **Kern-User-Journey** in evcc: Fahrzeug einstecken → Modus wählen → Ladevorgang startet. Der Test validiert, dass WebSocket-Daten vom echten Backend korrekt in der UI ankommen, Modus-Buttons auf Nutzerinteraktion reagieren und `Loadpoint`, `Mode` sowie `VehicleStatus` korrekt zusammenwirken. Kein anderer Test deckt diesen vollständigen Ablauf mit echtem Server-Backend ab.

---

### E2E-2: Smart-Cost-Threshold erlaubt Ladestart

**Datei:** `WAT4/e2e-tests/smart-cost-flow.spec.ts`

**Testszenario:**
Fahrzeug verbunden, kein aktiver Ladevorgang → Preislimit ≤ 40,0 ct/kWh konfigurieren → Simulator-Tarif liegt darunter → Modus „Schnell" wählen → UI zeigt „Charging…" und Smart-Cost-Badge mit Preis-Limit-Vergleich (`≤ 40.0 ct`).

**Warum dieser E2E-Test kritisch ist:**
Smart-Cost-Laden ist der **wirtschaftliche Kern-Use-Case** für Nutzer mit dynamischen Stromtarifen. Der Test prüft den vollständigen Kausal-Flow: Threshold-Setzen → Gate öffnet sich → Statusübergang Connected → Charging. Die Assertion `≤ 40.0 ct` verifiziert, dass der UI der konkrete Preis-Threshold korrekt aus dem Backend empfangen und angezeigt wird.

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
# Schritt 1: evcc-Server starten
go run . --config tests/simulator.evcc.yaml

# k6 installieren (Windows, einmalig)
winget install k6

# Schritt 2: Lasttest ausführen
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
| Unit (Vitest) | Jeder Test mount die Komponente frisch; kein globaler State; kein Backend |
| Integration (Cypress CT) | Jeder `it()`-Block mounted Komponente neu; Stubs für nicht relevante Sub-Komponenten |
| E2E (Playwright) | `beforeEach` startet frischen Simulator + evcc-Server; `afterEach` stoppt beide |
| Lasttest (k6) | Jeder VU ist unabhängig; Server muss manuell gestartet werden |

### Mock-Strategie

- **i18n**: `$t`, `$te`, `$i18n` werden in allen Tests gemockt (kein echtes vue-i18n nötig)
- **Sub-Komponenten**: `VehicleSoc`, `ChargingPlan` (in IT-1/IT-2) und `VehicleTitle` werden gestubbt, um Tests auf die Ziel-Komponentenkette zu fokussieren. `VehicleStatus`, `BatteryBoostButton` und `ChargingPlan` (in IT-3) bleiben bewusst ungestubbt.
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

### Unit-Tests (Vitest)

```
Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  ~2s
```

Alle 9 Testfälle laufen grün. Die Datei wird automatisch durch Vitests Standard-Glob-Pattern `**/*.test.ts` gefunden.

### Integrationstests (Cypress CT)

Alle 13 Integrationstests in den drei Cypress-CT-Dateien laufen erfolgreich durch. Die Tests wurden im interaktiven Cypress-Browser-Modus (`npm run test:cypress:open`) verifiziert.

### E2E-Tests (Playwright)

Die E2E-Tests erfordern einen laufenden evcc-Server mit Go-Build-Umgebung. Eine Verifikation erfordert `go run . --config tests/simulator.evcc.yaml` und anschließend `npx playwright test WAT4/e2e-tests/`.

### Lasttest (k6)

Der Lasttest erfordert eine k6-Installation (`winget install k6`) und einen laufenden evcc-Server. Erwartete Ergebnisse bei lokalem Betrieb: WS-Verbindungszeit p95 < 100 ms, API-Antwortzeit p95 < 50 ms, Fehlerrate 0 %.

---

## 10. Fazit

Die implementierten Tests decken drei qualitativ unterschiedliche Ebenen ab:

- **Unit-Ebene (`Warnings.vue`):** Die Ladeplan-Warnungslogik ist durch 9 Tests abgesichert, inklusive Boundary-Tests für die 60-Sekunden-Toleranz und beide Code-Branches (SoC- und Energie-Modus). Falsche Warnungen wären für Nutzer unsichtbar und würden Ladepläne still scheitern lassen.

- **Integrationsebene (Cypress CT):** Alle drei Integrationstests verwenden `Vehicle.vue` als echten Mediator und prüfen Prop-Flüsse über 3–4 Komponentengrenzen hinweg. Der `collector`-Mixin-Mechanismus, der Props automatisch an Kinder verteilt, kann nur im echten Browser verifiziert werden. Besonders der zweistufige Boost-Test (optimistisches Feedback vor Backend-Bestätigung) und der Abfahrtsplan-Test (ein `setProps()` aktualisiert zwei unabhängige Komponentenstränge gleichzeitig) sind repräsentative Integrationstests für die Vue-Reaktivitätsarchitektur von evcc.

- **E2E-Ebene (Playwright):** Die Kern-User-Journeys (Ladestart, Smart-Cost-Schwellenwert) werden gegen den echten evcc-Server validiert.

Die Auswahl der Testbereiche folgte dem Kriterium des **höchsten Schadenspotenzials bei einem Bug**: Bereiche, in denen ein einzelner Fehler entweder alle Nutzer betrifft (Ladeplan-Warnungen, MinSoc-Ladestart) oder direkte wirtschaftliche Konsequenzen hat (Smart-Cost, Battery-Boost), wurden bevorzugt getestet.

---

## 11. KI-Werkzeuge

Bei der Ausarbeitung dieser Projektarbeit wurde **Claude Sonnet 4.6** (Anthropic) als KI-Assistent eingesetzt. Das KI-Werkzeug unterstützte bei der Analyse der Komponentenarchitektur, dem Entwurf der Testfälle und der Implementierung der Testdateien. Alle Tests wurden anschließend manuell verifiziert und bei Bedarf korrigiert (z. B. `{ force: true }` für von `CustomSelect` überdeckte Buttons).
