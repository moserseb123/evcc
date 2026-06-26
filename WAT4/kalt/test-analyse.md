# evcc — Testpyramiden-Analyse & fachliche Begründung

> Arbeitsordner: `tests/projektarbeit/`. Alle Artefakte dieser Projektarbeit nur hier ablegen.

## 1. Anforderung (Mengengerüst)

Pro Person mindestens:

| Layer | Anzahl/Person |
|---|---|
| Unit Tests | 5 |
| Integration Tests | 3 |
| System/E2E Tests | 2 |
| Load Tests | 1 |
| **Summe/Person** | **11** |

2 Personen → **22 Tests** gesamt (Mindestanzahl). Existierende Funktionalität darf mit **anderer Technologie** erneut getestet werden. Bevorzugt: **Jest, Playwright** (+ k6 Load).

### Warum diese Form überhaupt — Testpyramide (Mike Cohn)
Die Mengen 5/3/2/1 sind kein Zufall, sondern die **Testpyramide**: viele billige, schnelle, isolierte Tests unten (Unit), wenige teure, langsame, breite Tests oben (E2E/Load).

- **Unten breit:** Unit-Tests laufen in ms, ohne Netzwerk/DB/Browser → man kann hunderte bei jedem Speichern ausführen. Fehler werden **lokalisiert** gemeldet (genaue Funktion).
- **Oben schmal:** E2E/Load sind langsam, brüchig (flaky) und teuer im Unterhalt. Sie geben aber als einzige Aussage über das **real integrierte System**. Darum wenige, gezielt auf kritische Pfade.
- **Anti-Pattern „Ice-Cone":** viele E2E, kaum Unit → langsame, instabile Suite, schlechte Fehlerlokalisierung. Das Mengengerüst zwingt bewusst die gesunde Pyramidenform.

---

## 2. Bestandsaufnahme (Ist-Zustand)

| Layer | Vorhanden | Technologie | Umfang | Ort |
|---|---|---|---|---|
| Unit Frontend | ✅ viel | Vitest + @vue/test-utils (happy-dom) | 15 Dateien | `assets/js/**/*.test.ts` |
| Unit Backend | ✅ sehr viel | Go `testing` | 156 Dateien | `**/*_test.go` |
| Integration | 🟡 teilweise | Vitest Component-Tests | wenige (z.B. `DeviceModal/index.test.ts`) | `assets/js/**` |
| E2E | ✅ massiv | Playwright (Chromium) | ~70 specs | `tests/*.spec.ts` |
| Load | ❌ keine | — | 0 | — |

### Werkzeug-Status
- **Vitest** aktiv (`npm test`, env happy-dom).
- **Playwright** aktiv (`npm run playwright`, baseURL `http://127.0.0.1:7070`).
- **Jest** vorhanden (`jest.config.ts`) aber **inaktiv**: kein Script, nur `@jest/types`. `testMatch: **/*.spec.ts` würde Playwright-specs einsammeln → vor Nutzung fixen.
- **k6** lokal installiert (`/c/Program Files/k6/k6`).
- evcc-Binary wird von Playwright via `tests/evcc.ts` gebootet (Fixtures `tests/*.evcc.yaml`, demo/simulator). Selbe Mechanik nutzbar für Integration + Load.

### Targets für Integration & Load (REST/WS)
`/api/state`, `/api/health`, `/api/sessions`, `/api/loadpoints`, `/api/vehicles`, `/api/tariff/...`, `/api/auth`, `/api/config/...`, WebSocket `/ws`.

---

## 3. Soll-Konzept pro Layer — *mit fachlicher Begründung*

### 3.1 Unit (5/Person) — Jest auf reine Funktionen
**Was:** reine Funktionen in `assets/js/utils/` (kein DOM, kein Netzwerk).
**Warum fachlich gut:**
- **Reine Funktionen = ideale Unit-Targets.** Gleicher Input → gleicher Output, keine Seiteneffekte, kein Setup/Teardown. Deterministisch → **nicht flaky**.
- **Hohe ROI:** schnell zu schreiben, schnell auszuführen, hoher Abdeckungsgewinn pro Zeile. Genau die „breite Basis" der Pyramide.
- **Andere Tech (Jest statt Vitest) ist fachlich sinnvoll**, nicht nur regelkonform: zeigt, dass die *Logik* getestet wird, nicht ein Framework-Verhalten. Deckt zudem Runner-spezifische Annahmen auf (Modul-Auflösung, Timer-Mocks, Matcher-Semantik). Vitest und Jest haben unterschiedliche Fake-Timer/ESM-Behandlung → dieselbe Funktion durch zwei Runner = stärkeres Vertrauen.

**Gute Targets:** `deepEqual.ts`, `deepClone.ts` (Rekursion/Edge-Cases), `convertRates.ts`, `energyOptions.ts`, `extractDomain.ts`, `tariffSlots.ts` (Zeit-/Slot-Logik = viele Randfälle), `forecast.ts`, `debounce.ts` (Timer → Fake-Timer).

**Warum gerade diese:** Funktionen mit **Verzweigungen und Randfällen** (leeres Array, null, Zeitzonen, Rundung) liefern echte Aussagekraft. Triviale Einzeiler (`sleep.ts`) würden die Quote füllen, aber fachlich nichts zeigen — bewusst vermeiden (Anforderung: „sinnvolle Tests").

### 3.2 Integration (3/Person)
Zwei legitime Ausprägungen — pro Person eine wählen oder mischen:

**Variante A — Vue-Component + gemockte API** (`@vue/test-utils`, axios/Store gemockt)
- **Warum gut:** prüft das Zusammenspiel *mehrerer Einheiten* (Komponente + Props + Store + Formatter) ohne echtes Backend. Mock isoliert die Netzwerk-Grenze → **schnell und stabil**, testet aber mehr als ein Unit (Rendering, Events, bedingte Anzeige).
- **Warum mocken:** echte API würde Test langsam + abhängig von Serverzustand machen. An der *Architektur-Grenze* (HTTP) zu mocken ist der klassische Integrationsschnitt: „unsere Komponenten zusammen, fremde Systeme simuliert".
- Targets: `Vehicles/Status`, `ChargingPlans/Preview`, Energyflow-Widget (Zustände: laden/laden-fertig/Fehler).

**Variante B — API + DB gegen laufendes evcc** (Playwright `request` oder Jest+axios)
- **Warum gut:** prüft die *echte* Naht zwischen HTTP-Handler, Domänenlogik und Persistenz (SQLite). Findet Fehler, die Mocks per Definition nicht finden (Serialisierung, Statuscodes, Schema-Drift, Migrationsverhalten).
- **Warum kein voller E2E:** kein Browser/UI nötig → schneller und stabiler als E2E, aber realer als ein Mock. Genau die mittlere Pyramidenschicht.
- Targets: `GET /api/state` (Schema + Pflichtfelder), `GET /api/sessions` (Persistenz nach Seed via `.sql`-Fixture), `GET/POST /api/loadpoints`.

**Fachlicher Kontrast A vs. B** (didaktisch wertvoll im Bericht): Mock-Integration = schnell/stabil/eng; API-Integration = realistisch/breiter/langsamer. Beide bewusst einsetzen zeigt Verständnis des **Mock-vs-Real-Trade-offs**.

### 3.3 System/E2E (2/Person) — Playwright
**Was:** echte User-Flows im Browser gegen gebootetes evcc, eigene `.evcc.yaml`-Fixture.
**Warum fachlich gut:**
- **Einzige Schicht mit Aussage über das Gesamtsystem** aus Nutzersicht (UI + WS + API + DB zusammen). Validiert das, was der Anwender tatsächlich tut.
- **Warum nur 2 / nur kritische Pfade:** E2E sind langsam und am brüchigsten (Timing, Selektoren, Async). Hoher Unterhaltsaufwand → bewusst auf **geschäftskritische Flows** beschränken, nicht auf Detaillogik (die gehört nach unten).
- **Eigene Fixture statt Demo-Daten:** macht den Test **deterministisch und reproduzierbar** (definierter Ausgangszustand) — Grundvoraussetzung gegen Flakiness.
- Playwright fachlich passend: Auto-Waiting + Web-First-Assertions reduzieren genau die Race-Conditions, die E2E sonst flaky machen.

**Flow-Ideen:** Loadpoint-Modus + Strom-Limit ändern und Wirkung prüfen; Config-Onboarding; Sessions-Ansicht. Vorlagen: `tests/basics.spec.ts`, Boot-Helper `tests/evcc.ts`.

### 3.4 Load (1/Person) — k6 (Greenfield)
**Was:** Lastlauf gegen gebootetes evcc (demo/simulator), z.B. `/api/state` mit konstanter RPS/VU-Zahl, optional `/ws`.
**Warum fachlich gut:**
- **Andere Qualitätsdimension als Funktion:** Unit/Integration/E2E prüfen *Korrektheit*, Load prüft **Verhalten unter Last** (Latenz, Durchsatz, Fehlerrate, Sättigung). Ein funktional korrekter Endpoint kann unter Last trotzdem brechen.
- **Thresholds = objektive Akzeptanzkriterien:** `http_req_duration p(95) < X ms`, `http_req_failed rate < Y` machen „Performance" messbar/bestehbar statt subjektiv. Perzentil (p95) statt Mittelwert, weil **Tail-Latenz** die echte Nutzererfahrung bestimmt.
- **Warum k6 statt Playwright-Last:** k6 ist für Lasterzeugung gebaut (geringer Overhead pro VU, viele VUs auf einer Maschine, native Metriken/Thresholds). Ein Browser-Tool pro virtuellem Nutzer würde die Maschine sättigen, bevor der Server es tut.
- **Warum echte Pflicht-Neuentwicklung:** im Projekt existiert **kein** Load-Test → einziger Layer ohne Vorlage, größter Eigenanteil.

---

## 4. Vorgeschlagene Aufteilung (2 Personen)

Gleiche Struktur, **disjunkte Targets** (kein doppelter Aufwand, breitere Abdeckung):

| | Person 1 | Person 2 |
|---|---|---|
| Unit ×5 | `deepEqual`, `deepClone`, `convertRates`, `energyOptions`, `extractDomain` | `tariffSlots`, `forecast`, `debounce`, `circuits`, `cleanYaml` |
| Integration ×3 | Variante A: Component-mount (Status, Preview, Energyflow) | Variante B: API+DB (`/api/state`, `/api/sessions`, `/api/loadpoints`) |
| E2E ×2 | Loadpoint-Flow, Limits-Flow | Config-Onboarding-Flow, Sessions-Flow |
| Load ×1 | k6 `/api/state` (RPS-Last, p95-Threshold) | k6 `/api/sessions` + WS `/ws` |

**Warum so aufgeteilt:** P1 deckt **Mock-Integration**, P2 deckt **Real-Integration** → der Bericht kann beide Ansätze direkt vergleichen. Unit-Targets disjunkt = mehr Code real abgedeckt statt Quote doppelt gefüllt.

---

## 5. Lücken & Risiken
- **Jest erst lauffähig machen** (Script + `testMatch` auf eigenes Verzeichnis + TS-Transform). Sonst kein Jest-Test bzw. Kollision mit Playwright-specs. Preset `@vue/cli-plugin-unit-jest` ist veraltet → ggf. `ts-jest`.
- **Load-Layer = einzige echte Neuentwicklung** → Zeit für Server-Boot + Script + Thresholds einplanen.
- **Integration-Begriff** mit Lehrendem abstimmen (Mock vs. API+DB) — Konzept oben deckt beide ab.
- evcc-Boot braucht Binary (`go run ./...` / `dist/`).
- **Determinismus:** alle nicht-Unit-Tests brauchen definierte Fixtures/Seeds (`.evcc.yaml`, `.sql`), sonst flaky.

---

## 6. Nächste Schritte
1. [ ] Jest in `tests/projektarbeit/` isoliert lauffähig machen.
2. [ ] Je 1 Beispiel-Gerüst pro Layer (Unit/Integration/E2E/Load).
3. [ ] Targets P1/P2 final festziehen.
4. [ ] Tests bis 11/Person implementieren.
5. [ ] Reports sichern (k6-Summary, Playwright-HTML) → als Nachweis in `tests/projektarbeit/`.
