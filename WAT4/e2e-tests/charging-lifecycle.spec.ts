import { test, expect } from "@playwright/test";
import { start, stop, baseUrl } from "../../tests/evcc";
import {
  startSimulator,
  stopSimulator,
  simulatorUrl,
  simulatorConfig,
  simulatorApply,
} from "../../tests/simulator";

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
 * E2E-1: Fahrzeug-Ladelifecycle
 */
test("Fahrzeug lädt und Moduswechsel wird in der UI reflektiert", async ({ page }) => {
  // Simulator konfigurieren: Fahrzeug verbunden und lädt aktiv
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("C (charging)").click();
  await page.getByTestId("loadpoint0").getByText("Enabled").check();
  await simulatorApply(page);

  // evcc-Hauptansicht öffnen
  await page.goto("/");

  // Ladepunkt ist sichtbar und zeigt Ladestatus
  const loadpoint = page.getByTestId("loadpoint");
  await expect(loadpoint).toBeVisible();

  // Fahrzeugstatus: Laden aktiv
  const status = page.getByTestId("vehicle-status-charger");
  await expect(status).toContainText(/Charging|Connected/);

  // Modus-Gruppe ist sichtbar
  const modeGroup = page.getByTestId("mode");
  await expect(modeGroup).toBeVisible();

  // Moduswechsel: letzten Button klicken ("Now")
  const modeButtons = modeGroup.getByRole("button");
  const lastButton = modeButtons.last();
  await lastButton.click();

  // Aktiver Modus hat die CSS-Klasse 'active'
  await expect(lastButton).toHaveClass(/active/);
});
