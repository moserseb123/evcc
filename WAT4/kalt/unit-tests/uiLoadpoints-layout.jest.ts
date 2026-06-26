/**
 * @jest-environment jsdom
 */
import {
  getLoadpointOrder,
  setLoadpointOrder,
  isLoadpointVisible,
  setLoadpointVisibility,
} from "@/uiLoadpoints";

describe("Loadpoint-Layout (Reihenfolge & Sichtbarkeit)", () => {
  it("ohne Konfiguration: keine Reihenfolge, sichtbar", () => {
    expect(getLoadpointOrder("90")).toBeNull();
    expect(isLoadpointVisible("90")).toBe(true);
  });

  it("setLoadpointOrder vergibt Indizes in Listenreihenfolge", () => {
    setLoadpointOrder(["92", "91"]);
    expect(getLoadpointOrder("92")).toBe(0);
    expect(getLoadpointOrder("91")).toBe(1);
  });

  it("Sichtbarkeit laesst sich ausschalten", () => {
    setLoadpointVisibility("93", false);
    expect(isLoadpointVisible("93")).toBe(false);
  });
});
