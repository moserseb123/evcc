import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { isRemoteClientActive } from "@/utils/remote";

/**
 * UT: Remote-Client-Aktivitätserkennung
 *
 * evcc erlaubt Fernzugriff über registrierte Remote-Clients. isRemoteClientActive
 * bestimmt anhand des letzten "gesehen"-Zeitstempels ob ein Client noch aktiv gilt.
 * Schwellwert: 5 Minuten. Grenzfälle bei exakt 5 Minuten sind sicherheitsrelevant –
 * ein falsch als "aktiv" gewerteter Client behält Zugriff obwohl er längst weg ist.
 */

describe("isRemoteClientActive – 5-Minuten-Aktivitätsfenster", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  test("true wenn Client vor 2 Minuten gesehen wurde (klar innerhalb des Fensters)", () => {
    expect(isRemoteClientActive({ alice: "2026-01-01T11:58:00Z" }, "alice")).toBe(true);
  });

  test("false bei exakt 5 Minuten – Grenzwert: Fenster ist abgelaufen", () => {
    expect(isRemoteClientActive({ alice: "2026-01-01T11:55:00Z" }, "alice")).toBe(false);
  });
});
