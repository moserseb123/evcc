import SessionTable from "@/components/Sessions/SessionTable.vue";

const session = (over: any = {}) => ({
  id: 1,
  created: "2026-06-01T10:00:00Z",
  finished: "2026-06-01T11:00:00Z",
  loadpoint: "Carport",
  identifier: "tag",
  vehicle: "ID.3",
  odometer: 1000,
  meterStart: 0,
  meterStop: 10,
  chargedEnergy: 10,
  chargeDuration: 3600,
  solarPercentage: 50,
  price: 2.5,
  pricePerKWh: 0.25,
  co2PerKWh: 100,
  ...over,
});

describe("SessionTable.vue – Ladehistorie (Cypress CT)", () => {
  it("zeigt einen Leer-Hinweis, wenn keine Ladevorgänge vorliegen", () => {
    cy.mount(SessionTable, { props: { sessions: [] } });
    cy.get('[data-testid="sessions-nodata"]').should("exist");
    cy.get('[data-testid="sessions-head"]').should("not.exist");
  });

  it("listet je Ladevorgang eine Zeile auf", () => {
    cy.mount(SessionTable, { props: { sessions: [session(), session({ id: 2 })] } });
    cy.get('[data-testid="sessions-nodata"]').should("not.exist");
    cy.get('[data-testid="sessions-entry"]').should("have.length", 2);
  });
});
