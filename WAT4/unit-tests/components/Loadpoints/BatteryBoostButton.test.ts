import { mount } from "@vue/test-utils";
import { describe, test, expect, beforeAll } from "vitest";
import { config } from "@vue/test-utils";
import BatteryBoostButton from "@/components/Loadpoints/BatteryBoostButton.vue";
import { CHARGE_MODE, BATTERY_MODE } from "@/types/evcc";

beforeAll(() => {
  config.global.mocks["$t"] = (key: string) => key;
  // Stub the BatteryBoost icon sub-component to keep tests focused on logic
  config.global.stubs["BatteryBoost"] = { template: "<span />" };
});

/**
 * UT-4: BatteryBoostButton.vue – Boost-Bedingungen und Fortschrittsberechnung
 */
describe("Deaktivierungs-Bedingungen", () => {
  test("Button ist disabled wenn mode=OFF oder mode=NOW (kein Boost möglich)", () => {
    const offWrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.OFF, batterySoc: 80, batteryBoostLimit: 50 },
    });
    expect(offWrapper.find("button").attributes("disabled")).toBeDefined();

    const nowWrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.NOW, batterySoc: 80, batteryBoostLimit: 50 },
    });
    expect(nowWrapper.find("button").attributes("disabled")).toBeDefined();
  });

  test("Button ist klickbar im PV-Modus oberhalb des Boost-Limits", () => {
    const wrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.PV, batterySoc: 80, batteryBoostLimit: 50 },
    });
    expect(wrapper.find("button").attributes("disabled")).toBeUndefined();
    expect((wrapper.vm as any).belowLimit).toBe(false);
    expect((wrapper.vm as any).available).toBe(true);
  });

  test("belowLimit=true wenn SoC unter dem Boost-Limit liegt", () => {
    const wrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.PV, batterySoc: 30, batteryBoostLimit: 50 },
    });
    expect((wrapper.vm as any).belowLimit).toBe(true);
    expect((wrapper.vm as any).available).toBe(false);
  });

  test("batteryHold=true und available=false wenn Batterie im Hold-Modus", () => {
    const wrapper = mount(BatteryBoostButton, {
      props: {
        mode: CHARGE_MODE.PV,
        batterySoc: 80,
        batteryBoostLimit: 50,
        batteryMode: BATTERY_MODE.HOLD,
      },
    });
    expect((wrapper.vm as any).batteryHold).toBe(true);
    expect((wrapper.vm as any).available).toBe(false);
  });
});

describe("adjustedSoc – Fortschrittsbalken-Berechnung", () => {
  // Formel: ((batterySoc - boostLimit) / (100 - boostLimit)) * 100

  test("adjustedSoc = 50% bei SoC=75, Limit=50", () => {
    const wrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.PV, batterySoc: 75, batteryBoostLimit: 50 },
    });
    // ((75 - 50) / (100 - 50)) * 100 = (25 / 50) * 100 = 50
    expect((wrapper.vm as any).adjustedSoc).toBe(50);
  });

  test("adjustedSoc = 0 wenn SoC unter dem Limit liegt (Math.max-Clamp)", () => {
    const wrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.PV, batterySoc: 20, batteryBoostLimit: 50 },
    });
    expect((wrapper.vm as any).adjustedSoc).toBe(0);
  });

  test("adjustedSoc = 100 wenn Akku voll geladen (batterySoc = 100)", () => {
    const wrapper = mount(BatteryBoostButton, {
      props: { mode: CHARGE_MODE.PV, batterySoc: 100, batteryBoostLimit: 50 },
    });
    // ((100 - 50) / (100 - 50)) * 100 = 100
    expect((wrapper.vm as any).adjustedSoc).toBe(100);
  });
});
