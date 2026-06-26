import DateNavigator from "@/components/Sessions/DateNavigator.vue";

const today = new Date();

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

describe("DateNavigator.vue – Sessions-Datumsnavigation (Cypress CT)", () => {
  it("lässt nicht vor den ältesten Sessions zurücknavigieren", () => {
    cy.mount(DateNavigator, {
      props: props({ day: 1, month: 1, year: 2026, startDate: new Date(2026, 0, 1) }),
    });
    cy.get('[data-testid="navigate-prev-day"]').should("be.disabled");
  });

  it("lässt nicht in die Zukunft navigieren (heutiger Tag ist Grenze)", () => {
    cy.mount(DateNavigator, {
      props: props({
        day: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        startDate: new Date(2020, 0, 1),
      }),
    });
    cy.get('[data-testid="navigate-next-day"]').should("be.disabled");
  });

  it("lädt nach Tageswahl den gewählten Tag nach (update-date)", () => {
    const onUpdateDate = cy.stub().as("upd");
    cy.mount(DateNavigator, {
      props: {
        ...props({ day: 1, month: 1, year: 2026, startDate: new Date(2026, 0, 1) }),
        "onUpdate-date": onUpdateDate,
        onUpdateDate,
      },
    });
    cy.get('[data-testid="navigate-next-day"]').click({ force: true });
    cy.get("@upd").should("have.been.called");
  });
});
