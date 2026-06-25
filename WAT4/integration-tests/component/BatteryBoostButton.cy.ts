import BatteryBoostButton from "@/components/Loadpoints/BatteryBoostButton.vue";

/**
 * IT-2: BatteryBoostButton.vue – Visueller Zustand und Click-Interaktion (Cypress CT)
 */
describe("BatteryBoostButton.vue – Visuelle Zustände und Klick-Verhalten", () => {
  it("Button ist disabled im OFF-Modus und aktivierbar im PV-Modus", () => {
    // OFF-Modus: disabled
    cy.mount(BatteryBoostButton, {
      props: { mode: "off", batterySoc: 80, batteryBoostLimit: 50 },
    });
    cy.get('[data-testid="battery-boost-button"]').should("be.disabled");

    // PV-Modus über Limit: nicht disabled
    cy.mount(BatteryBoostButton, {
      props: { mode: "pv", batterySoc: 80, batteryBoostLimit: 50 },
    });
    cy.get('[data-testid="battery-boost-button"]').should("not.be.disabled");
  });

  it("hat CSS-Klasse 'belowLimit' wenn SoC unter dem Boost-Limit liegt", () => {
    cy.mount(BatteryBoostButton, {
      props: { mode: "pv", batterySoc: 30, batteryBoostLimit: 50 },
    });
    cy.get('[data-testid="battery-boost-button"]').should("have.class", "belowLimit");
    cy.get('[data-testid="battery-boost-button"]').should("not.have.class", "active");
  });

  it("Klick oberhalb des Limits emittiert 'updated' mit true", () => {
    const onUpdated = cy.stub().as("onUpdated");
    cy.mount(BatteryBoostButton, {
      props: {
        mode: "pv",
        batterySoc: 80,
        batteryBoostLimit: 50,
        batteryBoost: false,
        onUpdated,
      },
    });

    cy.get('[data-testid="battery-boost-button"]').should("not.be.disabled").click();
    // Boost wird aktiviert → Event mit true
    cy.get("@onUpdated").should("have.been.calledWith", true);
  });

  it("Klick unterhalb des Limits emittiert KEIN 'updated'-Event (Sicherheitsmechanismus)", () => {
    const onUpdated = cy.stub().as("onUpdated");
    const onStatus = cy.stub().as("onStatus");
    cy.mount(BatteryBoostButton, {
      props: {
        mode: "pv",
        batterySoc: 30,
        batteryBoostLimit: 50,
        batteryBoost: false,
        onUpdated,
        onStatus,
      },
    });

    cy.get('[data-testid="battery-boost-button"]').click();
    // Nur Status-Message emittiert, KEIN updated-Event
    cy.get("@onUpdated").should("not.have.been.called");
    cy.get("@onStatus").should("have.been.called");
  });
});
