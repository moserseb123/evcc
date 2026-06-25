import LimitSocSelect from "@/components/Vehicles/LimitSocSelect.vue";

/**
 * IT-3: LimitSocSelect.vue – DOM-Optionen und Select-Interaktion (Cypress CT)
 */
describe("LimitSocSelect.vue – DOM-Rendering und Select-Interaktion", () => {
  it("rendert 17 Select-Optionen von 20 bis 100 in 5%-Schritten", () => {
    cy.mount(LimitSocSelect, {
      props: { limitSoc: 80 },
    });

    // 17 Optionen: 20, 25, 30, ..., 100
    cy.get("select option").should("have.length", 17);
    cy.get("select option").first().should("have.value", "20");
    cy.get("select option").last().should("have.value", "100");
  });

  it("zeigt Reichweite-Anzeige wenn rangePerSoc gesetzt ist", () => {
    cy.mount(LimitSocSelect, {
      props: { limitSoc: 80, rangePerSoc: 5 },
    });

    // .extraValue erscheint nur wenn estimatedTargetRange truthy ist (80 * 5 = 400)
    cy.get(".extraValue").should("exist");
  });

  it("Select-Änderung emittiert 'limit-soc-updated' mit Integer-Wert", () => {
    const onLimitSocUpdated = cy.stub().as("onLimitSocUpdated");
    cy.mount(LimitSocSelect, {
      props: { limitSoc: 80, onLimitSocUpdated },
    });

    // force:true nötig da select opacity:0 (von styled span überlagert)
    cy.get("select").select("60", { force: true });
    // Event wurde mit Integer 60 emittiert (nicht String "60")
    cy.get("@onLimitSocUpdated").should("have.been.calledWith", 60);
  });
});
