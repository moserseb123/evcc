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
    // Event wurde mit Integer 60 emittiert
    cy.get("@onLimitSocUpdated").should("have.been.calledWith", 60);
  });

  it("vollständiger Zyklus: Nutzer wählt neues Limit → Event → Prop-Update → Select und Reichweite passen sich an", () => {
    const onLimitSocUpdated = cy.stub().as("onLimitSocUpdated");
    // cy.vue() existiert in Cypress 14 nicht – Wrapper aus mount().then() speichern
    let vueWrapper: any;
    cy.mount(LimitSocSelect, {
      props: { limitSoc: 80, rangePerSoc: 5, onLimitSocUpdated },
    }).then(({ wrapper }) => {
      vueWrapper = wrapper;
    });

    // Initialer Zustand: Select zeigt 80, Reichweite 400 km (80 × 5)
    cy.get("select").should("have.value", "80");
    cy.get(".extraValue").should("contain.text", "400");

    // Nutzer wählt neues Limit
    cy.get("select").select("60", { force: true });
    cy.get("@onLimitSocUpdated").should("have.been.calledWith", 60);

    // Parent-Komponente reagiert und schreibt Prop zurück (reale App-Logik)
    cy.then(() => vueWrapper.setProps({ limitSoc: 60 }));

    // Select-Wert und Reichweite müssen sich reaktiv aktualisieren
    // (AnimatedNumber hat 100ms Debounce + 0.5s Animation – Cypress retries warten automatisch)
    cy.get("select").should("have.value", "60");
    cy.get(".extraValue").should("contain.text", "300");
  });

  it("Reichweite-Anzeige aktualisiert sich dynamisch bei jedem neuen limitSoc-Prop", () => {
    let vueWrapper: any;
    cy.mount(LimitSocSelect, {
      props: { limitSoc: 100, rangePerSoc: 4 },
    }).then(({ wrapper }) => {
      vueWrapper = wrapper;
    });

    // 100% → 400 km (100 × 4)
    cy.get(".extraValue").should("contain.text", "400");

    // Limit auf 50% reduzieren
    cy.then(() => vueWrapper.setProps({ limitSoc: 50 }));
    cy.get(".extraValue").should("contain.text", "200");

    // Limit auf 20% reduzieren (Minimum)
    cy.then(() => vueWrapper.setProps({ limitSoc: 20 }));
    cy.get(".extraValue").should("contain.text", "80");
  });
});
