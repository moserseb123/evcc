import { mount } from "@vue/test-utils";
import { describe, test, expect, beforeAll } from "vitest";
import { config } from "@vue/test-utils";
import LimitEnergySelect from "@/components/Vehicles/LimitEnergySelect.vue";

beforeAll(() => {
  config.global.mocks["$t"] = (key: string) => key;
  config.global.stubs["LabelAndValue"] = { template: "<div><slot /></div>" };
  config.global.stubs["AnimatedNumber"] = { template: "<span />" };
});

/**
 * UT-4: LimitEnergySelect.vue – Energielimit-Auswahl mit SoC-Schätzung
 */
describe("estimated – SoC-Schätzung aus Energielimit und Kapazität", () => {
  test("estimated = null wenn socPerKwh nicht bekannt (Kapazität unbekannt)", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { limitEnergy: 20, chargedEnergy: 0 },
    });
    expect((wrapper.vm as any).estimated).toBeNull();
  });

  test("estimated = round(limitEnergy × socPerKwh)", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { limitEnergy: 10, socPerKwh: 5, chargedEnergy: 0 },
    });
    // 10 kWh × 5 %/kWh = 50 %
    expect((wrapper.vm as any).estimated).toBe(50);
  });

  test("estimated = 0 wenn limitEnergy = 0 (kein Energielimit gesetzt)", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { limitEnergy: 0, socPerKwh: 5, chargedEnergy: 0 },
    });
    // Math.round(0 × 5) = 0 (kein Limit → keine Schätzung sinnvoll)
    expect((wrapper.vm as any).estimated).toBe(0);
  });
});

describe("step – Adaptiver Optionsschritt je nach Fahrzeugkapazität", () => {
  test("step = 5 kWh bei großer Kapazität (≥ 75 kWh)", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { capacity: 100, chargedEnergy: 0 },
    });
    expect((wrapper.vm as any).step).toBe(5);
  });

  test("step = 1 kWh bei mittelgroßer Kapazität (10–24 kWh)", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { capacity: 20, chargedEnergy: 0 },
    });
    expect((wrapper.vm as any).step).toBe(1);
  });

  test("step = 5 kWh als Fallback wenn capacity fehlt (capacity || 100)", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { chargedEnergy: 0 },
    });
    expect((wrapper.vm as any).step).toBe(5);
  });
});

describe("Event-Emission – change emittiert Float-Wert", () => {
  test("change emittiert 'limit-energy-updated' mit float-geparsetem Wert", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { limitEnergy: 0, chargedEnergy: 0, capacity: 20 },
    });
    (wrapper.vm as any).change({ target: { value: "7.5" } });
    expect(wrapper.emitted("limit-energy-updated")).toBeTruthy();
    expect(wrapper.emitted("limit-energy-updated")![0][0]).toBe(7.5);
  });

  test("change emittiert ganzzahligen kWh-Wert korrekt als Number", () => {
    const wrapper = mount(LimitEnergySelect, {
      props: { limitEnergy: 0, chargedEnergy: 0, capacity: 20 },
    });
    (wrapper.vm as any).change({ target: { value: "10" } });
    expect(wrapper.emitted("limit-energy-updated")![0][0]).toBe(10);
  });
});
