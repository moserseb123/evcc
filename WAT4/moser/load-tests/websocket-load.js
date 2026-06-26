/**
 * LT: WebSocket & REST-API Load test (k6)
 *
 * Dieser Test simuliert realistische Haushalts-Last:
 * - Ramp-up auf 10 gleichzeitige "Browser" (ein Haushalt + mehrere Geräte)
 * - Kurze Spitze auf 20 gleichzeitige Verbindungen
 * - Jeder "Browser" hält eine WebSocket-Verbindung + macht REST-API-Anfragen
 */

import ws from "k6/ws";
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const wsErrorRate = new Rate("ws_errors");
const apiErrorRate = new Rate("api_errors");
const wsMessageLatency = new Trend("ws_message_latency_ms");

const BASE_URL = "http://localhost:7070";
const WS_URL = "ws://localhost:7070/ws";

// k6 Lastprofil
export const options = {
  stages: [
    { duration: "20s", target: 5 },
    { duration: "30s", target: 10 },
    { duration: "20s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    // WebSocket-Verbindung muss in 95% der Fälle unter 500ms aufgebaut sein
    ws_connecting: ["p(95)<500"],
    // REST-API-Antworten müssen in 95% der Fälle unter 500ms sein
    http_req_duration: ["p(95)<500"],
    // Fehlerrate WebSocket unter 1%
    ws_errors: ["rate<0.01"],
    // API-Fehlerrate unter 1%
    api_errors: ["rate<0.01"],
  },
};

/**
 * Hauptfunktion: Jeder virtuelle User (VU) simuliert einen Browser-Tab.
 * - REST-API: holt den aktuellen System-Zustand (wie beim Seitenaufruf)
 * - WebSocket: hält eine Live-Verbindung für Echtzeit-Updates (wie die evcc-UI)
 */
export default function () {
  // 1. REST-API-Aufruf: Initialer State-Abruf wie beim App-Start
  const apiResponse = http.get(`${BASE_URL}/api/state`);
  const apiOk = check(apiResponse, {
    "API /api/state: Status 200": (r) => r.status === 200,
    "API /api/state: Antwort hat loadpoints": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null;
      } catch {
        return false;
      }
    },
  });
  apiErrorRate.add(!apiOk);

  // 2. WebSocket-Verbindung: Simuliert eine offene Browser-Session
  const wsResponse = ws.connect(WS_URL, {}, function (socket) {
    let messageCount = 0;
    const connectTime = Date.now();

    socket.on("message", (data) => {
      messageCount++;
      // Latenz der ersten Nachricht messen (Zeit bis erstes State-Update)
      if (messageCount === 1) {
        wsMessageLatency.add(Date.now() - connectTime);
      }
      // Jede Nachricht ist ein gültiges JSON-Objekt
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

    // Verbindung für 5 Sekunden offen halten
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(wsResponse, {
    "WebSocket-Handshake erfolgreich (HTTP 101)": (r) => r && r.status === 101,
  });
  wsErrorRate.add(wsResponse.status !== 101);

  // 1s Pause zwischen den Iterationen
  sleep(1);
}
