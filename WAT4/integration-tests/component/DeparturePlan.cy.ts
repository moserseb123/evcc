import Vehicle from "@/components/Vehicles/Vehicle.vue";

/**
 * IT-3: Vehicle ↔ ChargingPlan ↔ VehicleStatus ↔ StatusItem – Abfahrtsplan-Visualisierung
 *
 * Getestetes Szenario (Abfahrtsplan einrichten):
 *   1. Kein Plan aktiv → ChargingPlan zeigt "none"-Text, keine Plan-Badges in VehicleStatus
 *   2. Plan wird eingerichtet → ChargingPlan zeigt Abfahrtszeit + Ziel-SoC, VehicleStatus zeigt planStart-Badge
 *   3. Plan springt in aktiven Zustand → VehicleStatus tauscht planStart-Badge gegen planActive-Badge
 */
describe("Vehicle ↔ ChargingPlan ↔ VehicleStatus ↔ StatusItem – Abfahrtsplan-Visualisierung", () => {
  // Abfahrtszeitpunkt: 6 Stunden in der Zukunft
  const PLAN_TIME = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const PROJECTED_START = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
  const PROJECTED_END = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

  const stubs = {
    VehicleSoc: true,
    VehicleTitle: true,
  };

  const baseProps = {
    socPerKwh: 0,
    integratedDevice: true,
    connected: true,
    enabled: true,
    charging: false,
    socBasedCharging: true,
    socBasedPlanning: true,
    effectiveLimitSoc: 80,
    vehicleSoc: 40,
  };

  it("ChargingPlan zeigt 'none' und kein Plan-Badge in VehicleStatus wenn kein Plan gesetzt", () => {
    cy.mount(Vehicle, {
      props: { ...baseProps, effectivePlanTime: undefined },
      global: { stubs },
    });

    cy.get('[data-testid="charging-plan-button"]').should(
      "contain.text",
      "main.chargingPlan.none"
    );

    cy.get('[data-testid="vehicle-status-planstart"]').should("not.exist");
    cy.get('[data-testid="vehicle-status-planactive"]').should("not.exist");
  });

  it("ChargingPlan zeigt Abfahrtszeit und Ziel-SoC wenn Plan gesetzt wird", () => {
    cy.mount(Vehicle, {
      props: {
        ...baseProps,
        effectivePlanTime: PLAN_TIME,
        effectivePlanSoc: 80,
        planProjectedStart: PROJECTED_START,
        planActive: false,
      },
      global: { stubs },
    });

    cy.get('[data-testid="charging-plan-button"]').should("contain.text", "80");

    // Abfahrtszeit soll angezeigt werden
    cy.get('[data-testid="charging-plan-button"] .targetTimeLabel').should("exist");
    cy.get('[data-testid="charging-plan-button"]').should(
      "not.contain.text",
      "main.chargingPlan.none"
    );
  });

  it("VehicleStatus zeigt planStart-Badge wenn Plan geplant aber noch nicht aktiv ist", () => {
    cy.mount(Vehicle, {
      props: {
        ...baseProps,
        effectivePlanTime: PLAN_TIME,
        effectivePlanSoc: 80,
        planProjectedStart: PROJECTED_START,
        planActive: false,
      },
      global: { stubs },
    });

    cy.get('[data-testid="vehicle-status-planstart"]').should("exist");
    cy.get('[data-testid="vehicle-status-planactive"]').should("not.exist");
  });

  it("planStart-Badge wechselt zu planActive-Badge wenn Ladeplan aktiv wird", () => {
    let vueWrapper: any;
    cy.mount(Vehicle, {
      props: {
        ...baseProps,
        effectivePlanTime: PLAN_TIME,
        effectivePlanSoc: 80,
        planProjectedStart: PROJECTED_START,
        planActive: false,
      },
      global: { stubs },
    }).then(({ wrapper }) => {
      vueWrapper = wrapper;
    });

    // Ausgangszustand: planStart-Badge sichtbar, planActive-Badge noch nicht
    cy.get('[data-testid="vehicle-status-planstart"]').should("exist");
    cy.get('[data-testid="vehicle-status-planactive"]').should("not.exist");

    // Backend startet Ladevorgang für Abfahrtsplan
    cy.then(() =>
      vueWrapper.setProps({
        planActive: true,
        planProjectedEnd: PROJECTED_END,
        charging: true,
      })
    );

    cy.get('[data-testid="vehicle-status-planactive"]').should("exist");
    cy.get('[data-testid="vehicle-status-planstart"]').should("not.exist");
    cy.get('[data-testid="charging-plan-button"]').should("contain.text", "80");
  });

  it("ChargingPlan-Button öffnet Dialog via 'open-modal'-Event wenn geklickt", () => {
    const onOpenModal = cy.stub().as("onOpenModal");
    cy.mount(Vehicle, {
      props: {
        ...baseProps,
        effectivePlanTime: PLAN_TIME,
        effectivePlanSoc: 80,
        planProjectedStart: PROJECTED_START,
        planActive: false,
        onOpenModal,
      },
      global: { stubs },
    });

    cy.get('[data-testid="charging-plan-button"]').click({ force: true });
    cy.get("@onOpenModal").should("have.been.calledOnce");
  });
});
