import { describe, test, expect, beforeEach } from "vitest";
import store from "@/store";

// Reset store state before each test to avoid cross-test contamination
beforeEach(() => {
  store.reset();
  store.offline(false);
});

/**
 * UT-1: store.ts – setProperty() via store.update()
 */
describe("store.update – Einfache Schlüssel", () => {
  test("setzt eine String-Property auf Top-Level", () => {
    store.update({ siteTitle: "Mein EV-Zuhause" });
    expect(store.state.siteTitle).toBe("Mein EV-Zuhause");
  });

  test("führt Object-Merge durch – bestehende Felder bleiben erhalten", () => {
    // Erstes Update setzt grid mit zwei Feldern
    store.update({ grid: { power: 1000, name: "Hauptzähler" } } as any);
    // Zweites Update überschreibt nur power (Merge, kein Replace)
    store.update({ grid: { power: 3000 } } as any);
    expect((store.state as any).grid.power).toBe(3000);
    expect((store.state as any).grid.name).toBe("Hauptzähler");
  });
});

describe("store.update – Dot-Notation (WebSocket-Muster)", () => {
  test("aktualisiert verschachtelte Loadpoint-Property via Dot-Notation", () => {
    // Vorbereitung: Ladepunkte-Array mit einem Eintrag setzen
    store.update({ loadpoints: [{ mode: "off", chargePower: 0 }] } as any);

    // WebSocket-Muster: partial update via dot-path
    store.update({ "loadpoints.0.chargePower": 7400 });

    expect((store.state.loadpoints as any)[0].chargePower).toBe(7400);
    // Ursprüngliche Felder bleiben unverändert
    expect((store.state.loadpoints as any)[0].mode).toBe("off");
  });
});

describe("store.reset", () => {
  test("leert Loadpoints-Array und behält offline-Flag", () => {
    store.offline(true);
    store.update({ loadpoints: [{ mode: "pv" }] } as any);
    store.update({ siteTitle: "Test" });

    store.reset();

    expect(store.state.loadpoints).toHaveLength(0);
    // offline ist explizit vom Reset ausgenommen
    expect(store.state.offline).toBe(true);
    // siteTitle wurde zurückgesetzt
    expect(store.state.siteTitle).toBeUndefined();
  });
});
