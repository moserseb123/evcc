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

describe("TariffChart.vue – Tarif-Slot-Rendering (Cypress CT)", () => {
  it("rendert pro Slot ein Balken-Element", () => {
    cy.mount(TariffChart, {
      props: { slots: [slot(), slot({ value: 0.4 }), slot({ value: 0.5 })] },
    });
    cy.get(".slot").should("have.length", 3);
  });

  it("markiert ladende Slots mit .active", () => {
    cy.mount(TariffChart, {
      props: { slots: [slot({ charging: true }), slot({ charging: false })] },
    });
    cy.get(".slot.active").should("have.length", 1);
  });

  it("setzt inactive-Klasse bei inactive-Prop", () => {
    cy.mount(TariffChart, { props: { slots: [slot()], inactive: true } });
    cy.get(".chart.inactive").should("exist");
  });
});
