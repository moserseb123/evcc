import Vehicle from "@/components/Vehicles/Vehicle.vue";

/**
 * IT-2: Vehicle ↔ VehicleStatus ↔ StatusItem – MinSoc-Ladestart bei Fahrzeugverbindung
 *
 * Getestetes Szenario:
 *   1. Fahrzeug getrennt → Status "disconnected", kein MinSoc-Badge
 *   2. Fahrzeug verbunden, MinSoc nicht erreicht, Ladung noch nicht aktiv
 *      → Status "waitForVehicle", MinSoc-Badge erscheint
 *   3. Ladevorgang startet
 *      → Status wechselt zu "charging", MinSoc-Badge bleibt sichtbar
 */
describe("Vehicle ↔ VehicleStatus ↔ StatusItem – MinSoc-Ladestart bei Fahrzeugverbindung", () => {
  const stubs = {
    VehicleSoc: true,
    ChargingPlan: true,
  };

  const disconnectedProps = {
    socPerKwh: 0,
    integratedDevice: true,
    connected: false,
    enabled: false,
    charging: false,
    minSocNotReached: false,
    socBasedCharging: true,
    effectiveLimitSoc: 80,
    vehicle: { minSoc: 20, title: "Test Car", icon: "" },
  };

  it("Status zeigt 'disconnected' und kein MinSoc-Badge wenn Fahrzeug nicht verbunden", () => {
    cy.mount(Vehicle, { props: disconnectedProps, global: { stubs } });

    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.disconnected"
    );

    cy.get('[data-testid="vehicle-status-minsoc"]').should("not.exist");
  });

  it("MinSoc-Badge erscheint sofort wenn Fahrzeug verbunden wird und MinSoc nicht erreicht ist", () => {
    cy.mount(Vehicle, {
      props: {
        ...disconnectedProps,
        connected: true,
        enabled: true,
        charging: false,
        minSocNotReached: true, // MinSoc (20%)
      },
      global: { stubs },
    });

    // VehicleStatus zeigt "waitForVehicle": verbunden, enabled, aber Ladung noch nicht aktiv
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.waitForVehicle"
    );

    cy.get('[data-testid="vehicle-status-minsoc"]').should("exist");
    cy.get('[data-testid="vehicle-status-minsoc"]').should("contain.text", "20");
  });

  it("Status wechselt zu 'charging' sobald Ladevorgang startet – MinSoc-Badge bleibt sichtbar", () => {
    let vueWrapper: any;
    cy.mount(Vehicle, {
      props: {
        ...disconnectedProps,
        connected: true,
        enabled: true,
        charging: false,
        minSocNotReached: true,
      },
      global: { stubs },
    }).then(({ wrapper }) => {
      vueWrapper = wrapper;
    });

    // MinSoc-Badge sichtbar, noch kein Ladevorgang
    cy.get('[data-testid="vehicle-status-minsoc"]').should("exist");
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.waitForVehicle"
    );

    // Ladung startet (Backend setzt charging=true)
    cy.then(() => vueWrapper.setProps({ charging: true }));

    // VehicleStatus.chargerStatus wechselt zu "charging"
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.charging"
    );

    // MinSoc-Badge bleibt aktiv: MinSoc ist noch nicht erreicht, Ladung läuft
    cy.get('[data-testid="vehicle-status-minsoc"]').should("exist");
  });

  it("MinSoc-Badge verschwindet wenn vehicleSoc den MinSoc-Schwellwert erreicht", () => {
    let vueWrapper: any;
    cy.mount(Vehicle, {
      props: {
        ...disconnectedProps,
        connected: true,
        enabled: true,
        charging: true,
        minSocNotReached: true,
        vehicleSoc: 10, // unter MinSoc (20%)
      },
      global: { stubs },
    }).then(({ wrapper }) => {
      vueWrapper = wrapper;
    });

    // Ladung aktiv, MinSoc-Badge sichtbar
    cy.get('[data-testid="vehicle-status-minsoc"]').should("exist");
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.charging"
    );

    // MinSoc erreicht → Backend setzt minSocNotReached=false
    cy.then(() => vueWrapper.setProps({ minSocNotReached: false, vehicleSoc: 22 }));

    // StatusItem für MinSoc verschwindet aus der statusItems-Liste
    cy.get('[data-testid="vehicle-status-minsoc"]').should("not.exist");

    // Ladevorgang läuft weiter
    cy.get('[data-testid="vehicle-status-charger"]').should(
      "contain.text",
      "main.vehicleStatus.charging"
    );
  });
});
