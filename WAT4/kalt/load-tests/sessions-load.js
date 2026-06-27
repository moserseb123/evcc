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
    ws_connecting: ["p(95)<500"],
    http_req_duration: ["p(95)<200"],
    ws_errors: ["rate<0.05"],
    api_errors: ["rate<0.05"],
    ws_connect_time_ms: ["p(95)<1000"],
  },
};

/**
 * Jeder VU simuliert einen Browser-Tab beim App-Start:
 * - REST: System-Status, Tarifdaten und Ladepunkte abrufen (wie beim App-Start der evcc-UI)
 * - WebSocket: Verbindung halten und auf Live-State-Updates warten (wie die evcc-UI im Betrieb)
 */
export default function () {
  const stateRes = http.get(`${BASE_URL}/api/state`);
  const stateOk = check(stateRes, {
    "GET /api/state: Status 200": (r) => r.status === 200,
    "GET /api/state: Body ist gültiges JSON": (r) => {
      if (!r.body || r.status !== 200) return false;
      try {
        const parsed = JSON.parse(r.body);
        return parsed !== null && typeof parsed === "object";
      } catch {
        return false;
      }
    },
  });
  apiErrorRate.add(stateOk ? 0 : 1);

  const tariffRes = http.get(`${BASE_URL}/api/tariff/grid`);
  const tariffOk = check(tariffRes, {
    "GET /api/tariff/grid: Status 200 oder 204": (r) => r.status === 200 || r.status === 204,
  });
  apiErrorRate.add(tariffOk ? 0 : 1);

  // Loadpoint-Daten sind im /api/state enthalten – kein separater List-Endpoint existiert
  const stateBody = stateRes.status === 200 ? JSON.parse(stateRes.body) : null;
  const loadpointsOk = check(stateBody, {
    "GET /api/state: Loadpoints vorhanden": (b) => b !== null && Array.isArray(b.loadpoints),
  });
  apiErrorRate.add(loadpointsOk ? 0 : 1);

  const connectStart = Date.now();
  const wsResponse = ws.connect(WS_URL, {}, function (socket) {
    let messageCount = 0;

    socket.on("open", () => {
      wsConnectTime.add(Date.now() - connectStart);
    });

    socket.on("message", (data) => {
      messageCount++;
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
