import TariffChart from "@/components/Tariff/TariffChart.vue";

/**
 * IT: TariffChart.vue – Tarifdaten visuell korrekt darstellen
 *
 * TariffChart zeigt dem Nutzer günstige und teure Ladefenster als farbige Balken.
 * Falsche Farbkodierung (aktives Fenster nicht hervorgehoben, Warnungen übersehen)
 * führt zu Fehlentscheidungen beim manuellen Laden – Nutzer laden dann unbewusst teuer.
 *
 * Getestete Szenarien:
 *   1. Alle übergebenen Slots werden als Balken gerendert
 *   2. Aktives Ladefenster (charging=true) erhält .active-Klasse
 *   3. Kein .active wenn kein Slot gerade lädt
 *   4. Teures Fenster (warning=true) erhält .warning-Klasse
 *   5. Nur exakt die markierten Slots sind active bzw. warning
 */

const slot = (over: any = {}) => ({
  day: "Mo",
  start: new Date(2026, 0, 1, 10, 0),
  end: new Date(2026, 0, 1, 10, 15),
  value: 0.3,
  charging: false,
  selectable: true,
  warning: false,
  ...over,
});

describe("TariffChart.vue – Tarif-Fenster-Visualisierung", () => {
  it("stellt jeden Slot als Balken dar", () => {
    cy.mount(TariffChart, {
      props: { slots: [slot({ value: 0.2 }), slot({ value: 0.4 }), slot({ value: 0.5 })] },
    });
    cy.get(".slot").should("have.length", 3);
  });

  it("markiert das aktive Ladefenster als .active", () => {
    cy.mount(TariffChart, {
      props: {
        slots: [slot({ charging: true, value: 0.2 }), slot({ charging: false, value: 0.5 })],
      },
    });
    cy.get(".slot.active").should("have.length", 1);
    cy.get(".slot:not(.active)").should("have.length", 1);
  });

  it("kein .active-Slot wenn kein Ladevorgang aktiv", () => {
    cy.mount(TariffChart, {
      props: {
        slots: [slot({ charging: false }), slot({ charging: false })],
      },
    });
    cy.get(".slot.active").should("not.exist");
  });

  it("markiert teure Fenster als .warning", () => {
    cy.mount(TariffChart, {
      props: {
        slots: [slot({ warning: true, value: 0.9 }), slot({ warning: false, value: 0.2 })],
      },
    });
    cy.get(".slot.warning").should("have.length", 1);
    cy.get(".slot:not(.warning)").should("have.length", 1);
  });

});
