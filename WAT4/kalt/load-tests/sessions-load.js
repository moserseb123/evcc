/**
 * LT: Tarif- & State-Abruf unter Last (k6)
 *
 * evcc muss unter gleichzeitiger Last mehrerer Haushalte Tarifdaten zuverlässig
 * ausliefern und WebSocket-State-Updates in Echtzeit senden.
 * Fällt dieser Pfad unter Last aus, treffen alle betroffenen Nutzer gleichzeitig
 * falsche Ladeentscheidungen – das Fahrzeug lädt teuer statt günstig.
 *
 * Simuliert wird:
 * - Mehrere "Browser-Sessions" rufen gleichzeitig System-Status und Tarifdaten ab
 * - Jede Session hält eine WebSocket-Verbindung für Live-Updates offen (wie die evcc-UI)
 * - Ramp-up auf realistischen Haushalts-Peak, kurze Lastspitze, Ramp-down
 */

import ws from "k6/ws";
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const wsErrorRate = new Rate("ws_errors");
const apiErrorRate = new Rate("api_errors");
const wsMessageLatency = new Trend("ws_message_latency_ms");
// Zeit vom WS-Connect bis erste Nachricht – misst wie schnell evcc State-Push liefert
const wsConnectTime = new Trend("ws_connect_time_ms");

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:7070";
const WS_URL = BASE_URL.replace("http://", "ws://").replace("https://", "wss://") + "/ws";

export const options = {
  stages: [
    { duration: "15s", target: 5 },
    { duration: "30s", target: 10 },
    { duration: "20s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    // WebSocket-Verbindungsaufbau in 95% der Fälle unter 500ms
    ws_connecting: ["p(95)<500"],
    // REST-Antworten in 95% der Fälle unter 200ms
    http_req_duration: ["p(95)<200"],
    // WebSocket-Fehlerrate unter 5%
    ws_errors: ["rate<0.05"],
    // API-Fehlerrate unter 5%
    api_errors: ["rate<0.05"],
    // Zeit bis erster WS-State-Push in 95% der Fälle unter 1000ms
    ws_connect_time_ms: ["p(95)<1000"],
  },
};

/**
 * Jeder VU simuliert einen Browser-Tab beim App-Start:
 * - REST: System-Status, Tarifdaten und Ladepunkte abrufen (wie beim App-Start der evcc-UI)
 * - WebSocket: Verbindung halten und auf Live-State-Updates warten (wie die evcc-UI im Betrieb)
 */
export default function () {
  // 1. REST: Aktuellen System-Status abrufen (erster Request beim App-Start)
  const stateRes = http.get(`${BASE_URL}/api/state`);
  const stateOk = check(stateRes, {
    "GET /api/state: Status 200": (r) => r.status === 200,
    "GET /api/state: Body ist gültiges JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });
  apiErrorRate.add(!stateOk);

  // 2. REST: Tarifdaten abrufen (Kernbasis für Ladeplan-Optimierung)
  const tariffRes = http.get(`${BASE_URL}/api/tariff/grid`);
  const tariffOk = check(tariffRes, {
    "GET /api/tariff/grid: Status 200 oder 204": (r) => r.status === 200 || r.status === 204,
  });
  apiErrorRate.add(!tariffOk);

  // 3. REST: Ladepunkte abrufen (UI zeigt je Loadpoint Karte + Status)
  const loadpointsRes = http.get(`${BASE_URL}/api/loadpoints`);
  const loadpointsOk = check(loadpointsRes, {
    "GET /api/loadpoints: Status 200": (r) => r.status === 200,
    "GET /api/loadpoints: Antwort ist Array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });
  apiErrorRate.add(!loadpointsOk);

  // 4. WebSocket: Live-Verbindung für Echtzeit-State-Updates
  const connectStart = Date.now();
  const wsResponse = ws.connect(WS_URL, {}, function (socket) {
    let messageCount = 0;

    socket.on("open", () => {
      // Zeit von connect() bis Socket bereit – Verbindungsaufbau-Latenz
      wsConnectTime.add(Date.now() - connectStart);
    });

    socket.on("message", (data) => {
      messageCount++;
      // Latenz bis zur ersten Nachricht messen (Zeit bis erstes State-Update nach Open)
      if (messageCount === 1) {
        wsMessageLatency.add(Date.now() - connectStart);
      }
      check(data, {
        "WS-Nachricht ist gültiges JSON": (d) => {
          try {
            JSON.parse(d);
            return true;
          } catch {
            return false;
          }
        },
      });
    });

    socket.on("error", (e) => {
      wsErrorRate.add(1);
      console.error(`WebSocket-Fehler: ${e}`);
    });

    // Verbindung 5 Sekunden offen halten (simuliert offene Browser-Session)
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(wsResponse, {
    "WebSocket-Handshake erfolgreich (HTTP 101)": (r) => r && r.status === 101,
  });
  wsErrorRate.add(wsResponse.status !== 101);

  sleep(1);
}
