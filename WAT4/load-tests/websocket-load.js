/**
 * LT-1: WebSocket-Verbindungsstress & REST-API Concurrent Load (k6)
 */

import ws from "k6/ws";
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Eigene Metriken für detaillierte Analyse
const wsErrorRate = new Rate("ws_errors");
const apiErrorRate = new Rate("api_errors");
const wsMessageLatency = new Trend("ws_message_latency_ms");

const BASE_URL = "http://localhost:7070";
const WS_URL = "ws://localhost:7070/ws";

/** k6 Lastprofil: Simuliert realistische Haushalts-Gleichzeitigkeit */
export const options = {
  stages: [
    { duration: "20s", target: 5 },  // Ramp-up: 0 → 5 gleichzeitige Clients
    { duration: "30s", target: 10 }, // Normallast: 10 Clients (typischer Haushalt)
    { duration: "20s", target: 20 }, // Spitzenlast: 20 Clients (Party/Gäste)
    { duration: "10s", target: 0 },  // Ramp-down
  ],
  thresholds: {
    // WebSocket-Verbindung muss in 95% der Fälle unter 500ms aufgebaut sein
    ws_connecting: ["p(95)<500"],
    // REST-API-Antworten müssen in 95% der Fälle unter 200ms sein
    http_req_duration: ["p(95)<200"],
    // Fehlerrate WebSocket unter 5%
    ws_errors: ["rate<0.05"],
    // API-Fehlerrate unter 5%
    api_errors: ["rate<0.05"],
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

    socket.on("open", () => {
      // Verbindung erfolgreich – Frontend würde jetzt auf Updates warten
    });

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

    socket.on("close", () => {
      // Verbindung wurde sauber geschlossen
    });

    // Verbindung für 5 Sekunden offen halten (Browser würde viel länger bleiben)
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(wsResponse, {
    "WebSocket-Handshake erfolgreich (HTTP 101)": (r) => r && r.status === 101,
  });
  wsErrorRate.add(wsResponse.status !== 101);

  // Kurze Pause zwischen den Iterationen (realistische Nutzungspausen)
  sleep(1);
}
