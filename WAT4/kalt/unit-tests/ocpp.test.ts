// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { getOcppUrl, getOcppUrlWithStationId } from "@/utils/ocpp";

/**
 * UT: OCPP URL-Generierung – Verbindungsadresse zur Wallbox
 *
 * OCPP ist das Protokoll über das evcc mit der Wallbox kommuniziert.
 * Eine falsch generierte URL verhindert den Verbindungsaufbau – das Fahrzeug lädt nicht.
 * Zwei Quellen bestimmen die URL (Priorität: externalUrl vor Fallback):
 *   1. externalUrl: explizit konfiguriert, z.B. hinter einem Reverse-Proxy
 *   2. Fallback: window.hostname + konfigurierter Port
 */

describe("OCPP URL-Generierung – Verbindungsadresse zur Wallbox", () => {
  test("nutzt externalUrl wenn gesetzt", () => {
    const ocpp = { status: { externalUrl: "wss://proxy.example/" }, config: { port: 8887 } };
    expect(getOcppUrl(ocpp as any)).toBe("wss://proxy.example/");
  });

  test("baut URL aus hostname und port wenn externalUrl leer ist (Fallback)", () => {
    const ocpp = { status: { externalUrl: "" }, config: { port: 8887 } };
    expect(getOcppUrl(ocpp as any)).toBe(`ws://${window.location.hostname}:8887/`);
  });

  test("hängt <stationId>-Platzhalter an externalUrl an", () => {
    const ocpp = { status: { externalUrl: "wss://proxy.example/" }, config: { port: 8887 } };
    expect(getOcppUrlWithStationId(ocpp as any)).toBe("wss://proxy.example/<stationId>");
  });
});
