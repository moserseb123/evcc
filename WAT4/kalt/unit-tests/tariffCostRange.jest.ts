import { calculateCostRange } from "@/utils/tariffSlots";

const slot = (value?: number) => ({ value } as any);

describe("calculateCostRange (Preisspanne)", () => {
  it("undefined min/max bei leerer Liste", () => {
    expect(calculateCostRange([])).toEqual({ min: undefined, max: undefined });
  });

  it("ermittelt kleinsten und groessten Preis", () => {
    expect(calculateCostRange([slot(0.2), slot(0.5), slot(0.3)])).toEqual({ min: 0.2, max: 0.5 });
  });

  it("ignoriert Slots ohne Wert", () => {
    expect(calculateCostRange([slot(undefined), slot(0.4), slot(undefined)])).toEqual({
      min: 0.4,
      max: 0.4,
    });
  });
});
