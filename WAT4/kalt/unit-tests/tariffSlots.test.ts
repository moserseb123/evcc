import { describe, test, expect } from "vitest";
import { calculateCostRange, findRateInRange, generateRateSlots } from "@/utils/tariffSlots";

/**
 * UT: tariffSlots – Preisspanne, Tarifsuche & Slot-Generierung
 *
 * Das Tarifsystem ist das Herzstück der kostenoptimierten Ladesteuerung:
 *   1. calculateCostRange: bestimmt min/max Preis für die Chart-Achsenskalierung
 *   2. findRateInRange: sucht den aktiven Tarif für ein konkretes Zeitfenster
 *   3. generateRateSlots: wandelt Tarife in 15-Minuten-Slots für den TariffChart um
 *
 * Fehler hier führen zu falsch berechneten oder falsch dargestellten Ladefenstern –
 * das Fahrzeug lädt zum falschen Zeitpunkt oder zu überhöhten Kosten.
 */

const HOUR = 60 * 60 * 1000;
const QUARTER = 15 * 60 * 1000;

const costSlot = (value?: number) => ({ value } as any);

const rate = (start: string, end: string, value: number) =>
  ({ start: new Date(start), end: new Date(end), value } as any);

const rateNow = (value: number, fromMs = 0, toMs = HOUR) => {
  const base = new Date();
  return { start: new Date(base.getTime() + fromMs), end: new Date(base.getTime() + toMs), value };
};

// ─── calculateCostRange ──────────────────────────────────────────────────────

describe("calculateCostRange – Preisspanne für Chart-Skalierung", () => {
  test("ermittelt kleinsten und größten Preis aus der Liste", () => {
    expect(calculateCostRange([costSlot(0.2), costSlot(0.5), costSlot(0.3)])).toEqual({
      min: 0.2,
      max: 0.5,
    });
  });

  test("ignoriert Slots ohne Wert (undefined)", () => {
    expect(
      calculateCostRange([costSlot(undefined), costSlot(0.4), costSlot(undefined)])
    ).toEqual({ min: 0.4, max: 0.4 });
  });
});

// ─── findRateInRange ─────────────────────────────────────────────────────────

const rates = [
  rate("2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", 0.2),
  rate("2026-01-01T11:00:00Z", "2026-01-01T12:00:00Z", 0.4),
];

describe("findRateInRange – aktiver Tarif für ein Zeitfenster", () => {
  test("findet überlappenden Tarif innerhalb eines Slots", () => {
    const r = findRateInRange(
      new Date("2026-01-01T11:30:00Z"),
      new Date("2026-01-01T11:45:00Z"),
      rates
    );
    expect(r?.value).toBe(0.4);
  });
});

// ─── generateRateSlots ───────────────────────────────────────────────────────

describe("generateRateSlots – 15-Minuten-Slots für TariffChart", () => {
  test("jeder generierte Slot ist exakt 15 Minuten lang", () => {
    const slots = generateRateSlots([rateNow(0.3)] as any, () => "Mo");
    for (const s of slots) {
      expect(s.end.getTime() - s.start.getTime()).toBe(QUARTER);
    }
  });

  test("selectable ist true genau dann wenn der Slot einen Wert hat", () => {
    const slots = generateRateSlots([rateNow(0.3)] as any, () => "Mo");
    for (const s of slots) {
      expect(s.selectable).toBe(s.value !== undefined);
    }
  });
});
