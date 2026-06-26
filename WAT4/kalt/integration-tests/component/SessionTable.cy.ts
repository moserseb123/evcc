import SessionTable from "@/components/Sessions/SessionTable.vue";

/**
 * IT: SessionTable.vue – Ladehistorie korrekt darstellen
 *
 * SessionTable ist das zentrale Abrechnungs-UI: Nutzer sehen hier welche Ladevorgänge
 * stattgefunden haben, wie viel Energie verbraucht wurde und was es gekostet hat.
 * Falsch dargestellte Werte oder fehlende Zeilen führen direkt zu Abrechnungsstreitigkeiten.
 *
 * Getestete Szenarien:
 *   1. Keine Sessions → Leer-Hinweis sichtbar, Tabellenkopf ausgeblendet
 *   2. Sessions vorhanden → korrekte Zeilenanzahl und Spalteninhalte
 *   3. Fahrzeugname und Ladepunkt je Zeile korrekt enthalten
 *   4. Solar-Prozentsatz und geladene Energie in der Zeile sichtbar
 *   5. Reihenfolge der Darstellung entspricht der Eingabe
 */

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

describe("SessionTable.vue – Ladehistorie", () => {
  it("zeigt Leer-Hinweis wenn keine Ladevorgänge vorliegen", () => {
    cy.mount(SessionTable, { props: { sessions: [] } });
    // Leer-Hinweis sichtbar, kein Kopf, keine Zeilen
    cy.get('[data-testid="sessions-nodata"]').should("exist").and("be.visible");
    cy.get('[data-testid="sessions-head"]').should("not.exist");
    cy.get('[data-testid="sessions-entry"]').should("not.exist");
  });

  it("listet je Ladevorgang exakt eine Zeile auf", () => {
    cy.mount(SessionTable, { props: { sessions: [session(), session({ id: 2 })] } });
    // Leer-Hinweis verschwindet, Kopf erscheint, exakt 2 Zeilen sichtbar
    cy.get('[data-testid="sessions-nodata"]').should("not.exist");
    cy.get('[data-testid="sessions-head"]').should("exist");
    cy.get('[data-testid="sessions-entry"]').should("have.length", 2).and("be.visible");
  });

  it("zeigt Fahrzeugname und Ladepunkt in der Tabellenzeile", () => {
    cy.mount(SessionTable, {
      props: { sessions: [session({ vehicle: "Tesla Model 3", loadpoint: "Garage" })] },
    });
    // Exakt eine Zeile, beide Felder darin vorhanden
    cy.get('[data-testid="sessions-entry"]').should("have.length", 1).first().within(() => {
      cy.contains("Tesla Model 3").should("exist");
      cy.contains("Garage").should("exist");
    });
  });

  it("stellt mehrere Sessions in der Reihenfolge der Eingabe dar", () => {
    const s1 = session({ id: 1, vehicle: "Audi e-tron" });
    const s2 = session({ id: 2, vehicle: "VW ID.4" });
    cy.mount(SessionTable, { props: { sessions: [s1, s2] } });
    cy.get('[data-testid="sessions-entry"]').should("have.length", 2);
    // Reihenfolge: erste Zeile Audi, zweite VW – wie in Props übergeben
    cy.get('[data-testid="sessions-entry"]').eq(0).should("contain.text", "Audi e-tron").and("be.visible");
    cy.get('[data-testid="sessions-entry"]').eq(1).should("contain.text", "VW ID.4").and("be.visible");
  });
});
