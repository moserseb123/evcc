import { mount, config } from "@vue/test-utils";
import { describe, test, expect, beforeAll } from "vitest";
import Mode from "@/components/Loadpoints/Mode.vue";
import en from "../../../../i18n/en.json";

// Reuse real English translations so assertions test actual UI labels
const lookup = (key: string): string | undefined => {
  const v = key.split(".").reduce<any>((o, k) => o?.[k], en);
  return typeof v === "string" ? v : undefined;
};

beforeAll(() => {
  config.global.mocks["$t"] = (key: string) => lookup(key) ?? key;
  config.global.mocks["$te"] = (key: string) => lookup(key) !== undefined;
  config.global.mocks["$i18n"] = { locale: "en" };
});

/**
 * UT-3: Mode.vue – Verfügbare Lademodi und aktiver Modus
 */
describe("Verfügbare Lademodi – abhängig von System-Konfiguration", () => {
  test("zeigt 4 Buttons [OFF, PV, MINPV, NOW] wenn pvPossible=true", () => {
    const wrapper = mount(Mode, {
      props: { mode: "off", pvPossible: true, smartCostAvailable: false },
    });
    expect(wrapper.findAll("button")).toHaveLength(4);
  });

  test("zeigt 3 Buttons [OFF, PV/Smart, NOW] wenn nur smartCostAvailable=true", () => {
    const wrapper = mount(Mode, {
      props: { mode: "off", pvPossible: false, smartCostAvailable: true },
    });
    // Kein MINPV ohne PV
    expect(wrapper.findAll("button")).toHaveLength(3);
  });

  test("zeigt nur 2 Buttons [OFF, NOW] als Fallback ohne PV und SmartCost", () => {
    const wrapper = mount(Mode, {
      props: { mode: "off", pvPossible: false, smartCostAvailable: false },
    });
    expect(wrapper.findAll("button")).toHaveLength(2);
  });
});

describe("Aktiver Modus – visueller Zustand und Event-Emission", () => {
  test("genau ein Button trägt die 'active'-Klasse für den aktuellen Modus", () => {
    const wrapper = mount(Mode, {
      props: { mode: "pv", pvPossible: true },
    });
    const activeButtons = wrapper.findAll("button.active");
    expect(activeButtons).toHaveLength(1);
  });

  test("Klick auf Button emittiert 'updated'-Event mit dem geklickten Modus-Wert", async () => {
    const wrapper = mount(Mode, {
      props: { mode: "off", pvPossible: true },
    });
    const buttons = wrapper.findAll("button");
    // Buttons sind: [OFF, PV, MINPV, NOW] → Index 3 = NOW ("now")
    await buttons[3].trigger("click");
    expect(wrapper.emitted("updated")).toBeTruthy();
    expect(wrapper.emitted("updated")![0]).toEqual(["now"]);
  });
});
