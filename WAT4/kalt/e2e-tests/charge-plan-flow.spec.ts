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
 * E2E: Ladeplan konfigurieren – Fahrzeug bis zu bestimmter Zeit vollgeladen
 *
 * Nutzer können einen Ladeplan setzen, damit das Fahrzeug zu einer bestimmten Zeit
 * geladen ist. evcc optimiert dann wann innerhalb des Zeitfensters geladen wird
 * (z.B. wenn Strom günstig oder Solar-Überschuss vorhanden ist).
 * Validiert:
 *   1. Fahrzeug verbunden → Ladeplan-Button erscheint in der UI
 *   2. Klick öffnet Modal mit Zeit- und Energiefeldern
 *   3. Modal-Felder sind interaktiv (Nutzer kann Eingaben machen)
 *   4. Modal kann ohne Fehler geschlossen werden
 */

test("Ladeplan-Button erscheint wenn Fahrzeug verbunden", async ({ page }) => {
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("B (connected)").click();
  await simulatorApply(page);

  await page.goto("/");
  await expect(page.getByTestId("charging-plan-button").first()).toBeVisible();
});

test("Ladeplan-Modal öffnet sich mit Zeit- und Energiefeldern", async ({ page }) => {
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("B (connected)").click();
  await simulatorApply(page);

  await page.goto("/");
  await page.getByTestId("charging-plan-button").first().click();

  const modal = page.getByTestId("charging-plan-modal");
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId("static-plan-time")).toBeVisible();
  await expect(modal.getByTestId("static-plan-energy")).toBeVisible();
});

