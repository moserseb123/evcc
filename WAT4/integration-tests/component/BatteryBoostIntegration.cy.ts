import Vehicle from "@/components/Vehicles/Vehicle.vue";

/**
 * IT-1: Vehicle ↔ BatteryBoostButton ↔ VehicleStatus – Boost-Aktivierung startet Ladung
 *
 * Getestetes Szenario:
 *   1. Fahrzeug verbunden, Ladung gestoppt → BatteryBoostButton sichtbar, nicht aktiv; VehicleStatus zeigt "connected"
 *   2. Boost-Button wird gedrückt
 *      → optimistisches Feedback: Button wird "active"
 *      → "batteryboost-updated(true)" wird an den Parent emittiert
 *   3. Backend bestätigt → VehicleStatus wechselt zu "charging" – Ladung hat gestartet
 */
describe("Vehicle ↔ BatteryBoostButton ↔ VehicleStatus – Boost-Aktivierung startet Ladung", () => {
  const stubs = {
    VehicleSoc: true,
    ChargingPlan: true,
  };

  const baseProps = {
    socPerKwh: 0,
    integratedDevice: true,
    connected: true,
    enabled: true,
    charging: false,
    batteryBoost: false,
    batteryBoostAvailable: true,
    batteryBoostLimit: 50,
    batterySoc: 80,
    mode: "pv",
    socBasedCharging: true,
    effectiveLimitSoc: 80,
  };

  it("BatteryBoostButton ist sichtbar und inaktiv wenn Ladung gestoppt", () => {
    cy.mount(Vehicle, { props: baseProps, global: { stubs } });

    cy.get('[data-testid="battery-boost-button"]').should("exist");
    cy.get('[data-testid="battery-boost-button"]').should("not.have.class", "active");
    cy.get('[data-testid="battery-boost-button"]').should("not.be.disabled");

    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.waitForVehicle"
    );
  });

  it("Klick auf Boost-Button gibt sofortiges optimistisches Feedback und emittiert Event", () => {
    const onBatteryboostUpdated = cy.stub().as("onBatteryboostUpdated");
    cy.mount(Vehicle, {
      props: { ...baseProps, onBatteryboostUpdated },
      global: { stubs },
    });

    // Ausgangszustand: Button inaktiv
    cy.get('[data-testid="battery-boost-button"]').should("not.have.class", "active");

    // Klicke Boost Button --> aktiv
    cy.get('[data-testid="battery-boost-button"]').click({ force: true });
    cy.get('[data-testid="battery-boost-button"]').should("have.class", "active");

    cy.get("@onBatteryboostUpdated").should("have.been.calledOnce");
    cy.get("@onBatteryboostUpdated").should("have.been.calledWith", true);
  });

  it("VehicleStatus wechselt zu 'charging' nach Backend-Bestätigung (Kern-Integrationstest Teil 2)", () => {
    let vueWrapper: any;
    cy.mount(Vehicle, {
      props: baseProps,
      global: { stubs },
    }).then(({ wrapper }) => {
      vueWrapper = wrapper;
    });

    // Boost-Button drücken → optimistisches Feedback
    cy.get('[data-testid="battery-boost-button"]').click({ force: true });
    cy.get('[data-testid="battery-boost-button"]').should("have.class", "active");

    // VehicleStatus zeigt noch nicht "charging"
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "not.contain.text",
      "main.vehicleStatus.charging"
    );

    // Backend bestätigt: Boost aktiv, Ladung gestartet
    cy.then(() => vueWrapper.setProps({ batteryBoost: true, charging: true }));

    // VehicleStatus.chargerStatus wechselt reaktiv zu "charging"
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.charging"
    );

    // Button bleibt aktiv
    cy.get('[data-testid="battery-boost-button"]').should("have.class", "active");
  });

  it("Button ist disabled im OFF-Modus – Boost kann nicht gestartet werden", () => {
    cy.mount(Vehicle, {
      props: { ...baseProps, mode: "off" },
      global: { stubs },
    });

    cy.get('[data-testid="battery-boost-button"]').should("be.disabled");
  });
});
