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
 * E2E: Loadpoint-Grundansicht und Statusübergang connected → charging
 *
 * Validiert den grundlegenden Ladepunkt-Flow aus Nutzersicht:
 *   1. Loadpoint erscheint mit Name und Live-Leistungsanzeige in der UI
 *   2. Fahrzeug wird verbunden → UI zeigt "Connected" (kein aktiver Ladevorgang)
 *   3. Schnell-Modus aktiviert → Wallbox wechselt auf "C (charging)"
 *   4. UI spiegelt den Statuswechsel vollständig wider: "Charging" + Fortschrittsbalken
 */

test("Loadpoint erscheint mit Visualisierungs-Widget", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("loadpoint")).toHaveCount(1);
  await expect(page.getByTestId("visualization")).toBeVisible();
});

test("Statusübergang connected → charging vollständig im UI abgebildet", async ({ page }) => {
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("B (connected)").click();
  await simulatorApply(page);

  await page.goto("/");
  await expect(page.getByTestId("vehicle-status-charger")).toContainText("Connected");

  const modeGroup = page.getByTestId("mode");
  const schnellButton = modeGroup.getByRole("button").last();
  await schnellButton.click();
  await expect(schnellButton).toHaveClass(/active/);

  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("C (charging)").click();
  await simulatorApply(page);

  await page.goto("/");
  await expect(page.getByTestId("vehicle-status-charger")).toContainText("Charging", {
    timeout: 15000,
  });
  await expect(page.getByTestId("loadpoint").locator(".progress-bar-animated")).toHaveCount(1);
});
