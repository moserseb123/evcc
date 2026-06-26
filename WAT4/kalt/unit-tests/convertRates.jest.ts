import convertRates from "@/utils/convertRates";

const slot = (start: string, end: string, value: number) => ({ start, end, value });

describe("convertRates", () => {
  it("null ergibt leeres Array", () => {
    expect(convertRates(null)).toEqual([]);
  });

  it("leeres Array ergibt leeres Array", () => {
    expect(convertRates([])).toEqual([]);
  });

  it("wandelt start/end in Date und behaelt value", () => {
    const result = convertRates([slot("2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", 0.25)] as any);
    expect(result[0].start).toBeInstanceOf(Date);
    expect(result[0].end).toBeInstanceOf(Date);
    expect(result[0].value).toBe(0.25);
  });

  it("behaelt die Reihenfolge", () => {
    const result = convertRates([
      slot("2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", 1),
      slot("2026-01-01T01:00:00Z", "2026-01-01T02:00:00Z", 2),
    ] as any);
    expect(result.map((r) => r.value)).toEqual([1, 2]);
  });
});
