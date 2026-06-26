# WAT4 Projektarbeit – Testbericht (Kalt)
## 1. Die Anwendung

Für meine Tests sind vor allem drei Bereiche relevant:

- die reinen Hilfsfunktionen unter `assets/js/utils/` (Tarif-Slots, Forecast, OCPP-URL, Remote-Präsenz) – deterministisch und damit gute Unit-Targets
- `uiLoadpoints.ts`, das aus dem Roh-State die Loadpoint-Liste fürs UI ableitet (Reihenfolge, Sichtbarkeit)
- einige Vue-Komponenten aus den Bereichen Tarif und Sessions, die ich im Browser teste

## 2. Frameworks

- Unit: Jest mit ts-jest, in einer isolierten Config, die nur die `*.jest.ts`-Dateien in diesem Ordner einsammelt
- Integration: Cypress Component Testing – einzelne Vue-Komponenten werden im echten Chromium gemountet und auf DOM, CSS-Klassen und Events geprüft, ganz ohne Backend
- E2E: Playwright gegen ein echtes, gebootetes evcc mit eigener Fixture
- Last: k6, weil es genau für Lasterzeugung gebaut ist (wenig Overhead pro virtuellem Nutzer, native Thresholds)

Insgesamt sind es 47 Testfälle: 34 Unit, 8 Integration, 4 E2E und 1 Lasttest. Das Minimum von 11 ist damit deutlich übererfüllt.

## 3. Unit-Tests (Jest)

Zehn Dateien mit zusammen 34 Fällen:

- `convertRates` – wandelt die Roh-Tarifdaten in das Slot-Format des UI um. Nötig, weil jede Tarif- und Forecast-Anzeige auf dieser Konvertierung aufsetzt; ein Fehler hier zieht sich durch die gesamte Preisdarstellung.
- `forecastSolar` (`adjustedSolar`) – skaliert die PV-Prognose mit einem Kalibrierfaktor. Nötig, weil ein falscher Faktor die komplette Solar-Vorhersage verfälscht und die Nicht-Mutation den Roh-State schützt.
- `forecastLowestSlot` (`findLowestSumSlotIndex`) – findet das günstigste Ladefenster. Nötig, weil das der Kern des Smart-Chargings ist; ein Off-by-one verschiebt das Fenster und kostet den Nutzer direkt Geld.
- `forecastStaticTariff` (`isStaticTariff`) – unterscheidet statischen von dynamischem Tarif. Nötig, weil davon abhängt, ob die Smart-Cost-Planung überhaupt eingeblendet wird; falsch-positiv zeigt sinnlose Planung an.
- `ocpp` – baut die Wallbox-URL aus externalUrl bzw. Hostname/Port. Nötig, weil eine falsche URL die Wallbox unerreichbar bzw. nicht konfigurierbar macht.
- `remote` (`isRemoteClientActive`) – Online-Erkennung eines Remote-Clients über die 5-Minuten-Grenze. Nötig, weil die Zeitgrenze die fehleranfällige Stelle ist und die Online-Anzeige steuert.
- `tariffCostRange` (`calculateCostRange`) – ermittelt min/max-Preis. Nötig, weil diese Werte die Preis-Skala der Forecast-Anzeige bilden; Slots ohne Wert dürfen sie nicht verzerren.
- `tariffFindRate` (`findRateInRange`) – liefert den gerade geltenden Tarif. Nötig, weil das die Grundlage jeder aktuellen Kostenanzeige ist.
- `tariffGenerateSlots` (`generateRateSlots`) – rastert Tarife in 15-Minuten-Slots. Nötig, weil dieses Raster die gesamte Preis- und Lade-Markierung speist; eine falsche Rasterung verschiebt alle Markierungen.
- `uiLoadpoints-layout` (`setLoadpointOrder`) – Reihenfolge und Sichtbarkeit der Loadpoints. Nötig, weil ein Fehler Ladepunkte in falscher Reihenfolge oder gar nicht anzeigt.

Es sind durchweg reine Funktionen mit klaren Verzweigungen und Randfällen (leeres Array, null, Zeitgrenzen, Rundung) – genau dort steckt die Aussagekraft.

## 4. Integrationstests (Cypress Component Testing)

Auf diesem Layer mounte ich einzelne Vue-Komponenten mit `cy.mount` im echten Browser und prüfe, wie sie rendern und auf Eingaben reagieren – ohne laufendes Backend.Den i18n-`mount`-Helper teile ich mir mit Mosers Setup.

Drei Komponenten, acht Fälle:

- `TariffChart` – prüft, dass jedes Tarif-Fenster als Balken erscheint, das Fenster mit aktivem Laden hervorgehoben wird und teure Fenster eine Warnung bekommen. Nötig, weil der Nutzer genau daran ablesen soll, wann geladen wird und wann der Strom teuer ist; eine falsche Markierung führt zu falschen Annahmen über die Ladekosten.
- `DateNavigator` – prüft, dass nicht vor den ältesten Ladesessions zurück- und nicht in die Zukunft vorwärtsnavigiert werden kann und dass die Tageswahl den gewählten Tag nachlädt. Nötig, weil die Grenzen den verfügbaren Datenbereich abbilden – ohne sie landet der Nutzer in leeren Ansichten – und die Tageswahl die eigentliche Funktion der Komponente ist.
- `SessionTable` – prüft, dass ohne Ladevorgänge ein Leer-Hinweis erscheint und je Ladevorgang eine Zeile gelistet wird. Nötig, weil das die Ladehistorie ist; ein Fehler bedeutet entweder einen leeren Verlauf trotz vorhandener Daten oder einen Absturz bei Daten.

Component Testing ist hier sinnvoll, weil es das Zusammenspiel aus Komponente, Props, Unterkomponenten und Formattern im echten Browser prüft – stabiler und schneller als ein voller E2E-Test, aber realer als ein reiner Unit-Test.

## 5. End-to-End-Tests (Playwright)

Die E2E-Tests laufen im echten Browser gegen ein gebootetes evcc mit eigener Fixture (`basics.evcc.yaml`). Vor den Tests wird der Server gestartet, danach wieder gestoppt. Zwei Flows mit vier Fällen:

- `charge-plan-flow` – der fachliche Flow: der Nutzer öffnet über den Ladeplan-Button die Ladeplanung, das Modal erscheint und enthält die Planungsfelder für Zeit und Energiemenge. Nötig, weil die Ladeplanung der zentrale Smart-Charging-Workflow ist (festlegen, bis wann wie viel geladen sein soll) und dieser komplette Pfad – Klick, Modal, Planungs-UI – von keinem anderen Test abgedeckt wird.
- `loadpoint-flow` – prüft, dass die Hauptansicht Titel, Live-Leistung (1.0 kW) und genau einen Loadpoint zeigt. Nötig, weil das bestätigt, dass die WebSocket-Daten vom echten Backend korrekt im Ladepunkt-Widget ankommen. Bewusst ohne Mode-Klick, den deckt Moser ab.

## 6. Lasttest (k6)

Der Lasttest (`sessions-load.js`) geht gegen `/api/sessions`, einen Endpoint, der die Ladesessions aus SQLite liest. Nötig, weil ein funktional korrekter Endpoint unter Last trotzdem brechen kann und ein DB-gestützter Read ein anderes Lastverhalten zeigt als ein reiner In-Memory-State – im Projekt gab es vorher keinen einzigen Lasttest.

Das Lastprofil: 15 Sekunden hoch auf 20 virtuelle Nutzer, 30 Sekunden halten, 10 Sekunden wieder runter. Jeder Nutzer ruft `/api/sessions` und prüft Status 200 und dass die Antwort ein Array ist. Als objektive Akzeptanzkriterien dienen zwei Thresholds: die 95-Perzentil-Antwortzeit muss unter 500 ms bleiben und die Fehlerrate unter 1 Prozent. Das Perzentil statt eines Mittelwerts deshalb, weil die Tail-Latenz die tatsächliche Nutzererfahrung bestimmt.

## 7. Isolation

- Unit (Jest): reine Funktionen, kein Backend, kein Netzwerk; `clearMocks` zwischen den Fällen. Eine eigene `jest.config.cjs` sammelt nur die `*.jest.ts`-Dateien dieses Ordners ein und kollidiert damit nicht mit Vitest (`*.test.ts`) oder Playwright (`*.spec.ts`).
- Integration (Cypress): jeder Fall mountet die Komponente frisch, kein gemeinsamer Zustand, kein Backend.
- E2E (Playwright): pro Lauf wird ein frisches evcc mit Fixture gestartet und danach gestoppt, jeder Test bekommt einen eigenen Browser-Context.
- Last (k6): jeder virtuelle Nutzer ist unabhängig, der Server wird manuell gestartet.
