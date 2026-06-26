import { test, expect } from "@playwright/test";
import { start, stop, baseUrl } from "../../../tests/evcc";
import {
  startSimulator,
  stopSimulator,
  simulatorUrl,
  simulatorConfig,
  simulatorApply,
} from "../../../tests/simulator";

test.use({ baseURL: baseUrl() });
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await startSimulator();
  await start(simulatorConfig());
});

test.afterEach(async () => {
  await stop();
  await stopSimulator();
});

/**
 * E2E-1: Schnell-Modus startet Ladevorgang – Statusübergang und Ladedarstellung
 *
 * Validiert:
 * 1. UI zeigt korrekten Ausgangsstatus "Connected" (kein Ladevorgang)
 * 2. Modus-Klick auf "Schnell" (NOW) aktiviert den Button
 * 3. Nach Wallbox-Reaktion: Status wechselt zu "Charging…"
 * 4. Animierter Fortschrittsbalken zeigt laufenden Ladevorgang visuell an
 */
test("Schnell-Modus startet Ladevorgang und UI zeigt Ladeprozess", async ({ page }) => {
  // Simulator: Fahrzeug verbunden, aber noch nicht ladend
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("B (connected)").click();
  await page.getByTestId("loadpoint0").getByText("Enabled").check();
  await simulatorApply(page);

  // Haupt-UI: Ausgangsstatus ist "Connected." – kein aktiver Ladevorgang
  await page.goto("/");
  const loadpoint = page.getByTestId("loadpoint");
  await expect(loadpoint).toBeVisible();
  await expect(page.getByTestId("vehicle-status-charger")).toContainText("Connected");

  // Modus "Schnell" auswählen
  const modeGroup = page.getByTestId("mode");
  const schnellButton = modeGroup.getByRole("button").last();
  await schnellButton.click();
  await expect(schnellButton).toHaveClass(/active/);

  // Simulator: Wallbox reagiert auf Lade-Freigabe → charging
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("C (charging)").click();
  await simulatorApply(page);

  // WebSocket-Update → Ladevorgang sichtbar
  await page.goto("/");
  await expect(page.getByTestId("vehicle-status-charger")).toContainText("Charging", { timeout: 15000 });
  await expect(loadpoint.locator(".progress-bar-animated")).toHaveCount(1);
});
