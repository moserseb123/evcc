import { findRateInRange } from "@/utils/tariffSlots";

const rate = (start: string, end: string, value: number) =>
  ({ start: new Date(start), end: new Date(end), value } as any);

const rates = [
  rate("2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", 0.2),
  rate("2026-01-01T11:00:00Z", "2026-01-01T12:00:00Z", 0.4),
];

describe("findRateInRange (geltender Tarif im Zeitfenster)", () => {
  it("findet den ueberlappenden Tarif", () => {
    const r = findRateInRange(
      new Date("2026-01-01T11:30:00Z"),
      new Date("2026-01-01T11:45:00Z"),
      rates
    );
    expect(r?.value).toBe(0.4);
  });

  it("liefert undefined ausserhalb aller Tarife", () => {
    const r = findRateInRange(
      new Date("2026-01-01T09:00:00Z"),
      new Date("2026-01-01T09:30:00Z"),
      rates
    );
    expect(r).toBeUndefined();
  });
});
