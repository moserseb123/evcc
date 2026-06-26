import { describe, test, expect } from "vitest";
import { findLowestSumSlotIndex, isStaticTariff, adjustedSolar } from "@/utils/forecast";

/**
 * UT: forecast-Algorithmen – Solarprognose & günstigstes Ladefenster
 *
 * evcc nutzt Forecast-Daten um drei Kernfragen zu beantworten:
 *   1. findLowestSumSlotIndex: Wann ist das günstigste Zeitfenster zum Laden?
 *   2. isStaticTariff: Ist der Tarif statisch (gleich) oder dynamisch (variabel)?
 *   3. adjustedSolar: Wieviel Solarertrag ist heute/morgen zu erwarten?
 *
 * Fehler hier führen direkt zu falschen Ladeentscheidungen –
 * das Fahrzeug lädt teuer statt günstig oder nutzt Solarüberschuss nicht.
 */

const slots = (values: number[]) => values.map((value, i) => ({ start: `${i}`, value }));
const slot = (value: number) => ({ start: "", end: "", value });

// ─── findLowestSumSlotIndex ──────────────────────────────────────────────────

describe("findLowestSumSlotIndex – günstigstes Ladefenster", () => {
  test("findet Startindex des billigsten Fensters der Breite 2", () => {
    expect(findLowestSumSlotIndex(slots([3, 1, 1, 2, 5]), 2)).toBe(1);
  });

  test("berücksichtigt die gesamte Fensterbreite (Breite 3)", () => {
    expect(findLowestSumSlotIndex(slots([5, 1, 1, 1, 9]), 3)).toBe(1);
  });
});

// ─── isStaticTariff ──────────────────────────────────────────────────────────

describe("isStaticTariff – statischer vs. dynamischer Tarif", () => {
  test("true wenn alle Werte identisch sind", () => {
    expect(isStaticTariff([slot(0.3), slot(0.3), slot(0.3)] as any)).toBe(true);
  });

  test("false wenn auch nur ein Wert abweicht", () => {
    expect(isStaticTariff([slot(0.3), slot(0.3), slot(0.4)] as any)).toBe(false);
  });
});

// ─── adjustedSolar ───────────────────────────────────────────────────────────

describe("adjustedSolar – Solarertragsprognose skalieren", () => {
  test("skaliert today, tomorrow und dayAfterTomorrow mit scale-Faktor", () => {
    const result = adjustedSolar({
      scale: 2,
      today: { energy: 10 },
      tomorrow: { energy: 5 },
      dayAfterTomorrow: { energy: 3 },
    } as any) as any;
    expect(result.today.energy).toBe(20);
    expect(result.tomorrow.energy).toBe(10);
    expect(result.dayAfterTomorrow.energy).toBe(6);
  });
});
