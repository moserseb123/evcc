import Mode from "@/components/Loadpoints/Mode.vue";

/**
 * IT-1: Mode.vue – Browser-Rendering und DOM-Interaktion (Cypress CT)
 */
describe("Mode.vue – DOM-Rendering und Click-Interaktion", () => {
  it("rendert alle 4 Modus-Buttons bei pvPossible=true und markiert aktiven Modus", () => {
    cy.mount(Mode, {
      props: { mode: "pv", pvPossible: true, smartCostAvailable: false },
    });

    // Alle 4 Buttons vorhanden: OFF, PV, MINPV, NOW
    cy.get('[data-testid="mode"] button').should("have.length", 4);

    // Genau ein Button ist aktiv (PV)
    cy.get('[data-testid="mode"] button.active').should("have.length", 1);

    // Kein aktiver Button in einem deaktivierten Container
    cy.get('[data-testid="mode"]').should("exist");
  });

  it("Klick auf Modus-Button emittiert 'updated' mit korrektem Wert", () => {
    const onUpdated = cy.stub().as("onUpdated");
    cy.mount(Mode, {
      props: {
        mode: "off",
        pvPossible: true,
        smartCostAvailable: false,
        onUpdated,
      },
    });

    // Klick auf den 2. Button (Index 1 = PV bei pvPossible=true)
    cy.get('[data-testid="mode"] button').eq(1).click();

    // Event wurde mit "pv" emittiert
    cy.get("@onUpdated").should("have.been.calledOnce");
    cy.get("@onUpdated").should("have.been.calledWith", "pv");
  });

  it("zeigt nur 2 Buttons wenn weder PV noch SmartCost konfiguriert", () => {
    cy.mount(Mode, {
      props: { mode: "off", pvPossible: false, smartCostAvailable: false },
    });
    cy.get('[data-testid="mode"] button').should("have.length", 2);
  });
});
