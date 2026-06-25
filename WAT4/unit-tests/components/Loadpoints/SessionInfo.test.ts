import { mount } from "@vue/test-utils";
import { describe, test, expect, beforeAll, vi } from "vitest";
import { config } from "@vue/test-utils";
import SessionInfo from "@/components/Loadpoints/SessionInfo.vue";

vi.mock("@/uiLoadpoints", () => ({
  getLoadpointSessionInfo: vi.fn(() => undefined),
  setLoadpointSessionInfo: vi.fn(),
}));

beforeAll(() => {
  config.global.mocks["$t"] = (key: string) => key;
  config.global.stubs["LabelAndValue"] = {
    template: "<div><slot name='label' /><slot name='value' /></div>",
  };
  config.global.stubs["CustomSelect"] = { template: "<div><slot /></div>" };
});

/**
 * UT-5: SessionInfo.vue – Tarif-abhängige Metrik-Filterung und Navigation
 */
describe("options – Tarif-abhängige Metrik-Filterung", () => {
  test("ohne tariffGrid sind 'avgPrice' und 'price' nicht in den Optionen", () => {
    const wrapper = mount(SessionInfo, {
      props: { id: "1", chargeDurationInterpolated: 0 },
    });
    const keys = (wrapper.vm as any).optionKeys as string[];
    expect(keys).not.toContain("avgPrice");
    expect(keys).not.toContain("price");
  });

  test("mit tariffGrid sind 'avgPrice' und 'price' verfügbar", () => {
    const wrapper = mount(SessionInfo, {
      props: { id: "1", tariffGrid: 0.3, chargeDurationInterpolated: 0 },
    });
    const keys = (wrapper.vm as any).optionKeys as string[];
    expect(keys).toContain("avgPrice");
    expect(keys).toContain("price");
  });

  test("ohne tariffCo2 sind 'co2' und 'emission' nicht in den Optionen", () => {
    const wrapper = mount(SessionInfo, {
      props: { id: "1", chargeDurationInterpolated: 0 },
    });
    const keys = (wrapper.vm as any).optionKeys as string[];
    expect(keys).not.toContain("co2");
    expect(keys).not.toContain("emission");
  });

  test("'remaining' und 'finished' nur sichtbar wenn chargeRemainingDurationInterpolated > 0", () => {
    const withoutRemaining = mount(SessionInfo, {
      props: { id: "1", chargeRemainingDurationInterpolated: 0, chargeDurationInterpolated: 0 },
    });
    expect((withoutRemaining.vm as any).optionKeys).not.toContain("remaining");
    expect((withoutRemaining.vm as any).optionKeys).not.toContain("finished");

    const withRemaining = mount(SessionInfo, {
      props: { id: "1", chargeRemainingDurationInterpolated: 3600, chargeDurationInterpolated: 0 },
    });
    expect((withRemaining.vm as any).optionKeys).toContain("remaining");
    expect((withRemaining.vm as any).optionKeys).toContain("finished");
  });
});

describe("nextSessionInfo – Zyklisches Durchschalten der Metriken", () => {
  test("nextSessionInfo wechselt zum nächsten optionKey", () => {
    const wrapper = mount(SessionInfo, {
      props: { id: "1", tariffGrid: 0.3, chargeDurationInterpolated: 0 },
    });
    const vm = wrapper.vm as any;
    vm.selectedKey = vm.optionKeys[0];
    vm.nextSessionInfo();
    expect(vm.selectedKey).toBe(vm.optionKeys[1]);
  });

  test("nextSessionInfo springt am Ende der Liste zurück zum ersten optionKey", () => {
    const wrapper = mount(SessionInfo, {
      props: { id: "1", chargeDurationInterpolated: 0 },
    });
    const vm = wrapper.vm as any;
    const keys = vm.optionKeys as string[];
    vm.selectedKey = keys[keys.length - 1];
    vm.nextSessionInfo();
    expect(vm.selectedKey).toBe(keys[0]);
  });
});
