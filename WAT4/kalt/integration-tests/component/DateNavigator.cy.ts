import DateNavigator from "@/components/Sessions/DateNavigator.vue";

const props = (over: any = {}) => ({
  day: 15,
  month: 6,
  year: 2026,
  startDate: new Date(2026, 0, 1),
  showDay: true,
  showMonth: false,
  showYear: false,
  ...over,
});

describe("DateNavigator.vue – Datums-Navigation (Cypress CT)", () => {
  it("rendert Tages-Navigation mit Prev/Next/Datepicker", () => {
    cy.mount(DateNavigator, { props: props() });
    cy.get('[data-testid="navigate-prev-day"]').should("exist");
    cy.get('[data-testid="navigate-next-day"]').should("exist");
    cy.get('[data-testid="navigate-day"]').should("exist");
  });

  it("Prev-Tag ist am startDate deaktiviert", () => {
    cy.mount(DateNavigator, {
      props: props({ day: 1, month: 1, year: 2026, startDate: new Date(2026, 0, 1) }),
    });
    cy.get('[data-testid="navigate-prev-day"]').should("be.disabled");
  });

  it("Klick auf Next-Tag emittiert update-date", () => {
    const onUpdateDate = cy.stub().as("upd");
    cy.mount(DateNavigator, {
      props: {
        ...props({ day: 1, month: 1, year: 2026 }),
        "onUpdate-date": onUpdateDate,
        onUpdateDate,
      },
    });
    cy.get('[data-testid="navigate-next-day"]').click({ force: true });
    cy.get("@upd").should("have.been.called");
  });
});
