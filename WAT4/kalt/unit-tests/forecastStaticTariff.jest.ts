import { isStaticTariff } from "@/utils/forecast";

const slot = (value: number) => ({ start: "", end: "", value });

describe("isStaticTariff (statischer vs dynamischer Tarif)", () => {
  it("false ohne Slots", () => {
    expect(isStaticTariff(undefined)).toBe(false);
    expect(isStaticTariff([])).toBe(false);
  });

  it("true wenn alle Werte gleich sind", () => {
    expect(isStaticTariff([slot(0.3), slot(0.3), slot(0.3)] as any)).toBe(true);
  });

  it("false bei unterschiedlichen Werten", () => {
    expect(isStaticTariff([slot(0.3), slot(0.4)] as any)).toBe(false);
  });
});
