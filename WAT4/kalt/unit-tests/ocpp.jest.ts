/**
 * @jest-environment jsdom
 */
import { getOcppUrl, getOcppUrlWithStationId } from "@/utils/ocpp";

describe("ocpp url", () => {
  it("nutzt die externalUrl wenn gesetzt", () => {
    const ocpp = { status: { externalUrl: "wss://proxy.example/" }, config: { port: 8887 } };
    expect(getOcppUrl(ocpp as any)).toBe("wss://proxy.example/");
  });

  it("baut die URL aus hostname und port als Fallback", () => {
    const ocpp = { status: { externalUrl: "" }, config: { port: 8887 } };
    expect(getOcppUrl(ocpp as any)).toBe(`ws://${window.location.hostname}:8887/`);
  });

  it("haengt den stationId-Platzhalter an", () => {
    const ocpp = { status: { externalUrl: "wss://proxy.example/" }, config: { port: 8887 } };
    expect(getOcppUrlWithStationId(ocpp as any)).toBe("wss://proxy.example/<stationId>");
  });
});
