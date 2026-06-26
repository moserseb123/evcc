# WAT4 Projektarbeit – Testbericht (Kalt)
## 1. Die Anwendung

Für meine Tests sind vor allem drei Bereiche relevant:

- die reinen Hilfsfunktionen unter `assets/js/utils/` (Tarif-Slots, Forecast, OCPP-URL, Remote-Präsenz) – deterministisch und damit gute Unit-Targets
- einige Vue-Komponenten aus den Bereichen Tarif und Sessions, die ich im Browser teste

## 2. Frameworks

- Unit: Vitest, Framework-Standard des Projekts, nahtlose Vite-Integration
- Integration: Cypress Component Testing – einzelne Vue-Komponenten werden im echten Chromium gemountet und auf DOM, CSS-Klassen und Events geprüft, ganz ohne Backend
- E2E: Playwright gegen ein echtes, gebootetes evcc mit eigener Fixture
- Last: k6, weil es genau für Lasterzeugung gebaut ist (wenig Overhead pro virtuellem Nutzer, native Thresholds)

Insgesamt sind es 34 Testfälle: 15 Unit, 12 Integration, 6 E2E und 1 Lasttest. Das Minimum von 11 ist damit deutlich übererfüllt.

## 3. Unit-Tests (Jest)

Vier Dateien mit zusammen 20 Fällen. Thematisch konsolidiert, auf die wichtigsten Tests reduziert – je Datei alle verwandten Funktionen eines Moduls, mit Fokus auf die fachlich kritischen Pfade und Grenzwerte. Framework: Vitest (Projekt-Standard, wie Moser).

- `forecast.test.ts` (5 Fälle) – drei Kernfunktionen der Forecast-Logik: `findLowestSumSlotIndex` (günstigstes Ladefenster; Off-by-one verschiebt das Fenster und kostet den Nutzer direkt Geld), `isStaticTariff` (statisch vs. dynamisch; steuert ob Smart-Planung eingeblendet wird), `adjustedSolar` (PV-Prognose-Skalierung inkl. Deep-Copy-Verifikation).
- `tariffSlots.test.ts` (5 Fälle) – drei Kernfunktionen des Tarifsystems: `calculateCostRange` (min/max, ignoriert undefined-Slots), `findRateInRange` (trifft Tarif / undefined außerhalb), `generateRateSlots` (15-Minuten-Exaktheit, selectable spiegelt value).
- `ocpp.test.ts` (3 Fälle) – URL-Generierung: externalUrl hat Priorität, Fallback aus hostname + Port, `<stationId>`-Platzhalter. Falsche URL = Wallbox unerreichbar.
- `remote.test.ts` (2 Fälle) – `isRemoteClientActive`: kein Eintrag, klar aktiv (2 min), klar inaktiv (10 min), exakter Grenzwert (5 min = inaktiv). Sicherheitsrelevant.

Es sind durchweg reine Funktionen mit klaren Verzweigungen und Randfällen – genau dort steckt die Aussagekraft.

## 4. Integrationstests (Cypress Component Testing)

Auf diesem Layer mounte ich einzelne Vue-Komponenten mit `cy.mount` im echten Browser und prüfe, wie sie rendern und auf Eingaben reagieren – ohne laufendes Backend. Den i18n-`mount`-Helper teile ich mir mit Mosers Setup.

Drei Komponenten, 12 Fälle:

- `TariffChart` (4 Fälle) – alle Tarif-Fenster als Balken; aktives Ladefenster erhält `.active` / kein `.active` wenn kein Ladevorgang; teure Fenster erhalten `.warning` / kein `.warning` bei günstigen Preisen. Nötig, weil der Nutzer daran abliest wann Laden teuer oder günstig ist; falsche Markierungen führen zu falschen Ladeentscheidungen. Beide Richtungen (positiv + negativ) werden getestet.
- `DateNavigator` (4 Fälle) – Zurück-Button deaktiviert an ältester Session; Weiter-Button deaktiviert heute / aktiv bei Spielraum; Vorwärts- und Rückwärts-Klick emittieren `update-date` Event. Nötig, weil die Grenzen den verfügbaren Datenbereich abbilden und das Event die Kernfunktion ist – ohne es werden keine Sessions nachgeladen.
- `SessionTable` (4 Fälle) – Leer-Hinweis ohne Sessions; korrekte Zeilenanzahl; Reihenfolge wie Eingabe; Fahrzeugname und Ladepunkt je Zeile; geladene Energie; Solar-Prozentsatz. Nötig, weil das die Ladehistorie ist; falsche oder fehlende Werte führen direkt zu Abrechnungsstreitigkeiten.

Component Testing ist hier sinnvoll, weil es das Zusammenspiel aus Komponente, Props, Unterkomponenten und Formattern im echten Browser prüft – stabiler und schneller als ein voller E2E-Test, aber realer als ein reiner Unit-Test.

## 5. End-to-End-Tests (Playwright)

Die E2E-Tests laufen im echten Browser gegen ein gebootetes evcc mit Simulator-Backend (`startSimulator` + `simulatorConfig`). Vor jedem Test werden Simulator und Server gestartet, danach wieder gestoppt. Zwei Flows mit sechs Fällen – mit echten Statusübergängen über den Simulator:

- `charge-plan-flow` (4 Fälle) – der fachliche Ladeplan-Workflow: Simulator setzt Fahrzeug auf connected → Ladeplan-Button erscheint und ist klickbar. Klick öffnet Modal mit Zeit- und Energiefeldern. Beide Felder sind nicht deaktiviert (Nutzer kann Eingaben machen). Escape schließt das Modal ohne Fehler, Hauptseite bleibt intakt. Nötig, weil die Ladeplanung der zentrale Smart-Charging-Workflow ist und dieser komplette Pfad – realer Verbindungsstatus, Klick, Modal, Felder, Schließen – von keinem anderen Test abgedeckt wird.
- `loadpoint-flow` (2 Fälle) – Grundansicht und Statusübergang connected → charging: Loadpoint mit Visualisierungs-Widget sichtbar. Simulator auf B (connected) → UI zeigt „Connected". Schnell-Modus aktivieren, Simulator auf C (charging) → UI zeigt „Charging" und animierter Fortschrittsbalken. Nötig, weil dieser Test den vollständigen Ladevorgang-Workflow im echten Browser mit echtem Simulator-Statusübergang validiert.

## 6. Lasttest (k6)

Der Lasttest (`sessions-load.js`) testet REST + WebSocket unter paralleler Last: `/api/state` (System-Status), `/api/tariff/grid` (Tarifdaten), `/api/loadpoints` (Ladepunkte) und WebSocket `/ws` (Live-Updates). Nötig, weil ein Ausfall dieser Pfade unter Last alle Nutzer gleichzeitig falsche Ladeentscheidungen treffen lässt – Tarifdaten und State-Updates sind zeitkritisch und dürfen auch unter Peak-Last nicht ausfallen.

Jeder virtuelle User simuliert einen Browser-Tab beim App-Start: drei REST-Abrufe (Status, Tarif, Ladepunkte), dann WebSocket-Verbindung für 5 Sekunden offen halten. Custom Metrics: `ws_errors` (Rate), `api_errors` (Rate), `ws_message_latency_ms` (Trend bis erste WS-Nachricht), `ws_connect_time_ms` (Trend bis Socket-Open). Das Lastprofil: 15 s Ramp-up auf 5 VU, 30 s auf 10 VU, 20 s Spitze auf 20 VU, 10 s Ramp-down. Thresholds: HTTP p95 unter 200 ms, WS-Verbindungsaufbau p95 unter 500 ms, WS-State-Push p95 unter 1000 ms, beide Fehlerraten unter 5 %.

## 7. Isolation

- Unit (Vitest): reine Funktionen, kein Backend, kein Netzwerk. Läuft über die projekt-weite Vitest-Konfiguration gemeinsam mit Mosers `*.test.ts`-Dateien.
- Integration (Cypress): jeder Fall mountet die Komponente frisch, kein gemeinsamer Zustand, kein Backend.
- E2E (Playwright): `mode: serial`, pro Test werden Simulator und evcc-Server frisch gestartet und danach gestoppt (`beforeEach`/`afterEach`), jeder Test bekommt einen eigenen Browser-Context.
- Last (k6): jeder virtuelle Nutzer ist unabhängig, der Server wird manuell gestartet.
