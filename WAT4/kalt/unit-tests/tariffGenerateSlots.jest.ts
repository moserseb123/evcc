import { generateRateSlots } from "@/utils/tariffSlots";

const HOUR = 60 * 60 * 1000;
const QUARTER = 15 * 60 * 1000;

const rateNow = (value: number, fromMs = 0, toMs = HOUR) => {
  const base = new Date();
  return { start: new Date(base.getTime() + fromMs), end: new Date(base.getTime() + toMs), value };
};

describe("generateRateSlots (Tarif-Slot-Generierung)", () => {
  it("leere/fehlende rates ergeben leeres Array", () => {
    expect(generateRateSlots([], () => "Mo")).toEqual([]);
    expect(generateRateSlots(undefined as any, () => "Mo")).toEqual([]);
  });

  it("weekdayFormatter setzt das day-Feld jedes Slots", () => {
    const slots = generateRateSlots([rateNow(0.3)] as any, () => "TAG");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.day === "TAG")).toBe(true);
  });

  it("jeder Slot ist 15 Minuten lang; selectable spiegelt value", () => {
    const slots = generateRateSlots([rateNow(0.3)] as any, () => "Mo");
    for (const s of slots) {
      expect(s.end.getTime() - s.start.getTime()).toBe(QUARTER);
      expect(s.selectable).toBe(s.value !== undefined);
    }
  });

  it("charging/warning-Callbacks werden durchgereicht", () => {
    const slots = generateRateSlots(
      [rateNow(0.3)] as any,
      () => "Mo",
      (v) => v !== undefined,
      () => false
    );
    const covered = slots.filter((s) => s.value !== undefined);
    expect(covered.length).toBeGreaterThan(0);
    expect(covered.every((s) => s.charging === true)).toBe(true);
    expect(slots.every((s) => s.warning === false)).toBe(true);
  });
});
