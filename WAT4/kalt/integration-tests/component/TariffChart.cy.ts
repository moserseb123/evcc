import TariffChart from "@/components/Tariff/TariffChart.vue";

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

describe("TariffChart.vue – Tarif-Fenster im Browser (Cypress CT)", () => {
  it("stellt jedes Tarif-Fenster als Balken dar", () => {
    cy.mount(TariffChart, {
      props: { slots: [slot({ value: 0.2 }), slot({ value: 0.4 }), slot({ value: 0.5 })] },
    });
    cy.get(".slot").should("have.length", 3);
  });

  it("markiert das Ladefenster, in dem geladen wird, als aktiv", () => {
    cy.mount(TariffChart, {
      props: { slots: [slot({ charging: true, value: 0.2 }), slot({ charging: false, value: 0.5 })] },
    });
    cy.get(".slot.active").should("have.length", 1);
  });

  it("hebt teure Fenster als Warnung hervor", () => {
    cy.mount(TariffChart, {
      props: { slots: [slot({ warning: true, value: 0.9 }), slot({ warning: false, value: 0.2 })] },
    });
    cy.get(".slot.warning").should("have.length", 1);
  });
});
