import { mount } from "@vue/test-utils";
import { describe, test, expect, beforeAll } from "vitest";
import { config } from "@vue/test-utils";
import Phases from "@/components/Loadpoints/Phases.vue";

beforeAll(() => {
  config.global.mocks["$t"] = (key: string) => key;
});

/**
 * UT-3: Phases.vue – Phasenbreiten-Berechnung und Phasen-Aktivierung
 */
describe("targetWidth – Zielstrom als Balkenbreite", () => {
  test("targetWidth = offeredCurrent / maxCurrent wenn im gültigen Bereich", () => {
    const wrapper = mount(Phases, {
      props: { offeredCurrent: 8, minCurrent: 6, maxCurrent: 16 },
    });
    // (8 / 16) × 100 = 50 %
    expect((wrapper.vm as any).targetWidth()).toBe(50);
  });

  test("targetWidth klemmt auf minCurrent wenn offeredCurrent zu niedrig", () => {
    const wrapper = mount(Phases, {
      props: { offeredCurrent: 2, minCurrent: 6, maxCurrent: 16 },
    });
    // Math.max(6, 2) = 6 → (6 / 16) × 100 = 37.5 %
    expect((wrapper.vm as any).targetWidth()).toBeCloseTo(37.5);
  });

  test("targetWidth klemmt auf 100 % wenn offeredCurrent maxCurrent überschreitet", () => {
    const wrapper = mount(Phases, {
      props: { offeredCurrent: 20, minCurrent: 6, maxCurrent: 16 },
    });
    // Math.min(16, 20) = 16 → (16 / 16) × 100 = 100 %
    expect((wrapper.vm as any).targetWidth()).toBe(100);
  });
});

describe("isPhaseActive – Aktivierungs-Modus je nach verfügbaren Daten", () => {
  test("ohne chargeCurrents entscheidet phasesActive (1-phasig: nur Phase 1 aktiv)", () => {
    const wrapper = mount(Phases, {
      props: { phasesActive: 1, offeredCurrent: 8 },
    });
    expect((wrapper.vm as any).isPhaseActive(1)).toBe(true);
    expect((wrapper.vm as any).isPhaseActive(2)).toBe(false);
    expect((wrapper.vm as any).isPhaseActive(3)).toBe(false);
  });

  test("mit chargeCurrents: Phase aktiv wenn Ist-Strom ≥ 1 A", () => {
    const wrapper = mount(Phases, {
      props: { chargeCurrents: [10, 6, 0], offeredCurrent: 8 },
    });
    // chargeCurrentsActive = true (mind. eine Phase ≥ 1 A)
    expect((wrapper.vm as any).isPhaseActive(1)).toBe(true);
    expect((wrapper.vm as any).isPhaseActive(2)).toBe(true);
    expect((wrapper.vm as any).isPhaseActive(3)).toBe(false);
  });

  test("chargeCurrentsActive = false wenn alle Phasenströme < 1 A", () => {
    const wrapper = mount(Phases, {
      props: { chargeCurrents: [0, 0, 0] },
    });
    expect((wrapper.vm as any).chargeCurrentsActive).toBe(false);
  });
});

describe("realWidth – Ist-Strom als Balkenbreite", () => {
  test("realWidth gibt chargeCurrents[phase-1] / maxCurrent pro Phase zurück", () => {
    const wrapper = mount(Phases, {
      props: { chargeCurrents: [8, 4, 0], maxCurrent: 16, offeredCurrent: 8 },
    });
    expect((wrapper.vm as any).realWidth(1)).toBe(50); // (8 / 16) × 100
    expect((wrapper.vm as any).realWidth(2)).toBe(25); // (4 / 16) × 100
    expect((wrapper.vm as any).realWidth(3)).toBe(0);  // (0 / 16) × 100
  });

  test("realWidth fällt auf targetWidth zurück wenn keine chargeCurrents vorhanden", () => {
    const wrapper = mount(Phases, {
      props: { offeredCurrent: 8, minCurrent: 6, maxCurrent: 16 },
    });
    const target = (wrapper.vm as any).targetWidth();
    expect((wrapper.vm as any).realWidth(1)).toBe(target);
    expect((wrapper.vm as any).realWidth(2)).toBe(target);
  });
});
