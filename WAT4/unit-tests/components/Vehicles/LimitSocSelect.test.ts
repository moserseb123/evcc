import { mount, config } from "@vue/test-utils";
import { describe, test, expect, beforeAll } from "vitest";
import LimitSocSelect from "@/components/Vehicles/LimitSocSelect.vue";

beforeAll(() => {
  config.global.mocks["$t"] = (key: string) => key;
  config.global.mocks["$i18n"] = { locale: "en" };
  // Stub complex sub-components to focus on LimitSocSelect logic
  config.global.stubs = {
    LabelAndValue: { template: "<div><slot /></div>" },
    AnimatedNumber: { template: "<span>{{ to }}</span>", props: ["to", "format"] },
  };
});

/**
 * UT-5: LimitSocSelect.vue – SoC-Limit-Optionen und Reichweite-Berechnung
 */
describe("SoC-Optionen-Generierung", () => {
  test("generiert genau 17 Optionen von 20% bis 100% in 5%-Schritten", () => {
    const wrapper = mount(LimitSocSelect, { props: { limitSoc: 80 } });
    const vm = wrapper.vm as any;
    const options = vm.options;

    // Bereich: 20, 25, 30, ..., 100 → (100 - 20) / 5 + 1 = 17 Optionen
    expect(options).toHaveLength(17);
    expect(options[0].soc).toBe(20);
    expect(options[options.length - 1].soc).toBe(100);
    // Schrittweite prüfen
    expect(options[1].soc - options[0].soc).toBe(5);
  });

  test("nutzt Schrittweite 1 für Heizungsgeräte (heating=true)", () => {
    const wrapper = mount(LimitSocSelect, { props: { limitSoc: 60, heating: true } });
    const vm = wrapper.vm as any;
    // Heizung: 20°C bis 100°C in 1°-Schritten → 81 Optionen
    expect(vm.step).toBe(1);
    expect(vm.options).toHaveLength(81);
  });
});

describe("Reichweite-Schätzung", () => {
  test("berechnet Reichweite korrekt wenn rangePerSoc vorhanden", () => {
    const wrapper = mount(LimitSocSelect, { props: { limitSoc: 80, rangePerSoc: 5 } });
    const vm = wrapper.vm as any;
    // estimatedRange(80) = round(80 * 5) = 400 km
    expect(vm.estimatedRange(80)).toBe(400);
    expect(vm.estimatedTargetRange).toBe(400);
  });

  test("gibt null zurück wenn rangePerSoc nicht gesetzt (kein Fahrzeugbereich bekannt)", () => {
    const wrapper = mount(LimitSocSelect, { props: { limitSoc: 80 } });
    const vm = wrapper.vm as any;
    expect(vm.estimatedRange(80)).toBeNull();
    expect(vm.estimatedTargetRange).toBeNull();
  });

  test("Auswahl einer Option emittiert 'limit-soc-updated' mit dem neuen Integer-Wert", async () => {
    const wrapper = mount(LimitSocSelect, { props: { limitSoc: 80, rangePerSoc: 5 } });
    const select = wrapper.find("select");
    await select.setValue("60");
    expect(wrapper.emitted("limit-soc-updated")).toBeTruthy();
    // Emittierter Wert muss ein Integer sein (nicht String)
    expect(wrapper.emitted("limit-soc-updated")![0]).toEqual([60]);
  });
});
