import { describe, test, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Warnings from "@/components/ChargingPlans/Warnings.vue";

/**
 * UT: ChargingPlanWarnings.vue – Warnungslogik beim Einrichten eines Ladeplans
 *
 * Warnings.vue zeigt dem Nutzer kritische Hinweise wenn ein Ladeplan nicht wie
 * erwartet funktionieren wird. Falsche Warnungen (false positive/negative) führen
 * direkt zu unbemerkt fehlgeschlagenen Ladeplänen oder unnötiger Verwirrung.
 *
 */

const mountWarnings = (props: Record<string, unknown> = {}) =>
  mount(Warnings, {
    props,
    global: {
      mocks: {
        $t: (key: string) => key,
        $te: () => true,
        $i18n: { locale: "de" },
      },
    },
  });

// ─── Baseline ────────────────────────────────────────────────────────────────

describe("Keine Warnungen bei neutralen Props", () => {
  test("rendert keinen Text wenn alle Bedingungen unauffällig sind", () => {
    const wrapper = mountWarnings({
      socBasedPlanning: true,
      effectivePlanSoc: 80,
      effectiveLimitSoc: 80,
      vehicleLimitSoc: 100,
      mode: "pv",
    });

    expect(wrapper.find('[data-testid="plan-warnings"]').text()).toBe("");
  });
});

// ─── targetIsAboveLimit ───────────────────────────────────────────────────────

describe("targetIsAboveLimit – Ziel-SoC überschreitet Ladelimit", () => {
  test("zeigt Warnung wenn Plan-SoC (90%) über effectiveLimitSoc (80%) liegt", () => {
    const wrapper = mountWarnings({
      socBasedPlanning: true,
      effectivePlanSoc: 90,
      effectiveLimitSoc: 80,
    });

    expect(wrapper.html()).toContain("main.targetCharge.targetIsAboveLimit");
  });

  test("zeigt keine Warnung wenn Plan-SoC gleich dem Ladelimit ist", () => {
    const wrapper = mountWarnings({
      socBasedPlanning: true,
      effectivePlanSoc: 80,
      effectiveLimitSoc: 80,
    });

    expect(wrapper.html()).not.toContain("main.targetCharge.targetIsAboveLimit");
  });

  test("zeigt Warnung im Energie-Modus wenn Plan-Energie (30 kWh) über Energie-Limit (20 kWh) liegt", () => {
    const wrapper = mountWarnings({
      socBasedPlanning: false,
      planEnergy: 30,
      limitEnergy: 20,
    });

    expect(wrapper.html()).toContain("main.targetCharge.targetIsAboveLimit");
  });
});

// ─── notReachableInTime ───────────────────────────────────────────────────────

describe("notReachableInTime – Plan zeitlich nicht erreichbar", () => {
  const base = Date.now() + 2 * 60 * 60 * 1000; // Zielzeit: in 2 Stunden

  test("zeigt Warnung wenn geschätzte Endzeit die Zielzeit um mehr als 60 Sekunden überschreitet", () => {
    const wrapper = mountWarnings({
      plan: {
        planTime: new Date(base).toISOString(),
        plan: [{ end: new Date(base + 90_000) }], // 90s zu spät
      },
    });

    expect(wrapper.html()).toContain("main.targetCharge.notReachableInTime");
  });

  test("zeigt keine Warnung wenn die Überschreitung innerhalb der 60-Sekunden-Toleranz liegt", () => {
    const wrapper = mountWarnings({
      plan: {
        planTime: new Date(base).toISOString(),
        plan: [{ end: new Date(base + 30_000) }], // 30s zu spät – innerhalb Toleranz
      },
    });

    expect(wrapper.html()).not.toContain("main.targetCharge.notReachableInTime");
  });
});

// ─── targetIsAboveVehicleLimit ────────────────────────────────────────────────

describe("targetIsAboveVehicleLimit – Plan-SoC überschreitet Fahrzeug-Limit", () => {
  test("zeigt Warnung wenn Plan-SoC (95%) über dem Fahrzeug-Limit (80%) liegt", () => {
    const wrapper = mountWarnings({
      socBasedPlanning: true,
      effectivePlanSoc: 95,
      vehicleLimitSoc: 80,
    });

    expect(wrapper.html()).toContain("main.targetCharge.targetIsAboveVehicleLimit");
  });

  test("zeigt keine Warnung wenn Plan-SoC innerhalb des Fahrzeug-Limits liegt", () => {
    const wrapper = mountWarnings({
      socBasedPlanning: true,
      effectivePlanSoc: 75,
      vehicleLimitSoc: 80,
    });

    expect(wrapper.html()).not.toContain("main.targetCharge.targetIsAboveVehicleLimit");
  });
});

// ─── Modus-Warnung ────────────────────────────────────────────────────────────

describe("Modus-Warnung – Ladeplan nur im PV-Modus aktiv", () => {
  test("zeigt Hinweis wenn Lademodus 'off' ist – Plan läuft nicht an", () => {
    const wrapper = mountWarnings({ mode: "off" });

    expect(wrapper.html()).toContain("main.targetCharge.onlyInPvMode");
  });

  test("zeigt keinen Hinweis im PV-Modus", () => {
    const wrapper = mountWarnings({ mode: "pv" });

    expect(wrapper.html()).not.toContain("main.targetCharge.onlyInPvMode");
  });
});
