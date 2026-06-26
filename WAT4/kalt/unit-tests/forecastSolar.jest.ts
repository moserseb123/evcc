import { adjustedSolar } from "@/utils/forecast";

describe("adjustedSolar (Solar-Forecast-Skalierung)", () => {
  it("undefined bleibt undefined", () => {
    expect(adjustedSolar(undefined)).toBeUndefined();
  });

  it("ohne scale unveraendert zurueck", () => {
    const solar = { today: { energy: 10 } } as any;
    expect(adjustedSolar(solar)).toBe(solar);
  });

  it("skaliert today/tomorrow/dayAfterTomorrow energy", () => {
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

  it("skaliert jeden timeseries-Wert", () => {
    const result = adjustedSolar({
      scale: 3,
      timeseries: [{ val: 1 }, { val: 2 }],
    } as any) as any;
    expect(result.timeseries.map((e: any) => e.val)).toEqual([3, 6]);
  });

  it("invertiert scale fuer Rueck-Adjustierung", () => {
    const result = adjustedSolar({ scale: 4, today: { energy: 1 } } as any) as any;
    expect(result.scale).toBe(0.25);
  });

  it("mutiert das Eingangsobjekt nicht (deep copy)", () => {
    const solar = { scale: 2, today: { energy: 10 } } as any;
    adjustedSolar(solar);
    expect(solar.today.energy).toBe(10);
    expect(solar.scale).toBe(2);
  });
});
