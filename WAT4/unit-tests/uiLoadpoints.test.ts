import { describe, test, expect, vi } from "vitest";
import { convertToUiLoadpoints } from "@/uiLoadpoints";
import type { Loadpoint, Vehicle } from "@/types/evcc";

// Mock settings so tests don't depend on localStorage state between runs
vi.mock("@/settings", () => ({
  default: { loadpoints: {}, unit: undefined },
}));

/**
 * UT-2: uiLoadpoints.ts – convertToUiLoadpoints()
 *

/** Minimaler Loadpoint-Mock mit allen für Tests nötigen Feldern */
const makeLoadpoint = (overrides: Partial<Record<string, unknown>> = {}): Loadpoint =>
  ({
    name: "lp1",
    vehicleName: "",
    vehicleSoc: 0,
    vehicleRange: 0,
    chargePower: 0,
    chargedEnergy: 0,
    charging: false,
    connected: false,
    enabled: false,
    mode: "off",
    ...overrides,
  }) as unknown as Loadpoint;

describe("vehicleHasSoc – Fahrzeug-SoC-Verfügbarkeit", () => {
  test("false wenn kein Fahrzeug zugeordnet, true wenn Online-Fahrzeug zugeordnet", () => {
    // Kein Fahrzeug → vehicleHasSoc false
    const withoutVehicle = convertToUiLoadpoints([makeLoadpoint()], {});
    expect(withoutVehicle[0].vehicleHasSoc).toBe(false);
    expect(withoutVehicle[0].socBasedCharging).toBe(false);

    // Online-Fahrzeug → vehicleHasSoc true
    const onlineVehicle = { features: [] } as unknown as Vehicle;
    const withVehicle = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto" })],
      { auto: onlineVehicle }
    );
    expect(withVehicle[0].vehicleHasSoc).toBe(true);
    expect(withVehicle[0].socBasedCharging).toBe(true);
  });

  test("vehicleHasSoc false wenn Fahrzeug das Feature 'Offline' hat", () => {
    const offlineVehicle = { features: ["Offline"] } as unknown as Vehicle;
    const result = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto" })],
      { auto: offlineVehicle }
    );
    expect(result[0].vehicleHasSoc).toBe(false);
    // nur Offline, nicht Retryable → vehicleNotReachable false
    expect(result[0].vehicleNotReachable).toBe(false);
  });
});

describe("SoC- und Reichweite-Berechnungen", () => {
  test("rangePerSoc nur berechnet wenn vehicleSoc > 10 und Range vorhanden", () => {
    const vehicles = { auto: { features: [], capacity: 77 } as unknown as Vehicle };

    // Zu geringer SoC → keine Berechnung (verhindert Division durch kleine Zahlen)
    const lowSoc = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto", vehicleSoc: 5, vehicleRange: 200 })],
      vehicles
    );
    expect(lowSoc[0].rangePerSoc).toBeUndefined();

    // SoC = 80, Range = 400km → rangePerSoc = round((400/80)*100)/100 = 5 km/Prozent
    const highSoc = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto", vehicleSoc: 80, vehicleRange: 400 })],
      vehicles
    );
    expect(highSoc[0].rangePerSoc).toBe(5);
  });

  test("socPerKwh korrekt berechnet; 0 wenn Kapazität fehlt", () => {
    // Mit Kapazität: 100 / 75 kWh ≈ 1.333 %/kWh
    const vehicles75 = { auto: { features: [], capacity: 75 } as unknown as Vehicle };
    const withCap = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto", vehicleSoc: 50 })],
      vehicles75
    );
    expect(withCap[0].socPerKwh).toBeCloseTo(100 / 75, 5);

    // Ohne Kapazität → Division by Zero vermieden, Ergebnis = 0
    const withoutCap = convertToUiLoadpoints([makeLoadpoint()], {});
    expect(withoutCap[0].socPerKwh).toBe(0);
  });

  test("socBasedPlanning false wenn capacity = 0, true wenn capacity > 0 und SoC-basiert", () => {
    const noCapVehicle = { features: [], capacity: 0 } as unknown as Vehicle;
    const hasCapVehicle = { features: [], capacity: 60 } as unknown as Vehicle;

    const noCap = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto" })],
      { auto: noCapVehicle }
    );
    expect(noCap[0].socBasedPlanning).toBe(false);

    const hasCap = convertToUiLoadpoints(
      [makeLoadpoint({ vehicleName: "auto" })],
      { auto: hasCapVehicle }
    );
    expect(hasCap[0].socBasedPlanning).toBe(true);
  });
});
