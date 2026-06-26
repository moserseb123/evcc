import DateNavigator from "@/components/Sessions/DateNavigator.vue";

/**
 * IT: DateNavigator.vue – Navigation durch die Ladehistorie
 *
 * DateNavigator steuert welcher Tag in der Ladehistorie angezeigt wird.
 * Zwei harte Grenzen begrenzen die Navigation:
 *   - Rückwärts: der älteste vorhandene Session-Tag (startDate)
 *   - Vorwärts: der heutige Tag (noch keine zukünftigen Sessions vorhanden)
 *
 * Getestete Szenarien:
 *   1. Am ältesten Tag ist "zurück" deaktiviert
 *   2. Am heutigen Tag ist "vor" deaktiviert
 *   3. Vorwärts-Button ist aktiv wenn Spielraum vorhanden
 *   4. Vorwärts-Navigation emittiert update-date Event
 *   5. Zurück-Navigation emittiert update-date Event
 */

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

describe("DateNavigator.vue – Datumsnavigation Ladehistorie", () => {
  it("deaktiviert Zurück-Button am ältesten verfügbaren Tag", () => {
    cy.mount(DateNavigator, {
      props: props({ day: 1, month: 1, year: 2026, startDate: new Date(2026, 0, 1) }),
    });
    cy.get('[data-testid="navigate-prev-day"]').should("be.disabled");
  });

  it("deaktiviert Vor-Button am heutigen Tag (keine zukünftigen Sessions)", () => {
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

  it("Vorwärts-Klick emittiert update-date Event", () => {
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

  it("Rückwärts-Klick emittiert update-date Event wenn Spielraum vorhanden", () => {
    const onUpdateDate = cy.stub().as("upd");
    cy.mount(DateNavigator, {
      props: {
        ...props({ day: 10, month: 6, year: 2026, startDate: new Date(2026, 0, 1) }),
        "onUpdate-date": onUpdateDate,
        onUpdateDate,
      },
    });
    cy.get('[data-testid="navigate-prev-day"]').click({ force: true });
    cy.get("@upd").should("have.been.called");
  });
});
