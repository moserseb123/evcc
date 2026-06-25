import { test, expect } from "@playwright/test";
import { start, stop, baseUrl } from "../../tests/evcc";
import {
  startSimulator,
  stopSimulator,
  simulatorUrl,
  simulatorConfig,
  simulatorApply,
} from "../../tests/simulator";
import { expectModalHidden, expectModalVisible } from "../../tests/utils";

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
 * E2E-2: Smart-Cost-Ladeplanung
 */
test("Smart-Cost-Ladelimit wird gesetzt und im Status angezeigt", async ({ page }) => {
  // Simulator: PV-Strom erzeugen und Fahrzeug lädt
  await page.goto(simulatorUrl());
  await page.getByLabel("PV Power").fill("6000");
  await page.getByTestId("loadpoint0").getByText("C (charging)").click();
  await page.getByTestId("loadpoint0").getByText("Enabled").check();
  await simulatorApply(page);

  // evcc-Hauptansicht
  await page.goto("/");

  // Ladepunkt-Einstellungen öffnen (zweiter Button = Ladepunkt-Settings)
  await page.getByTestId("loadpoint-settings-button").nth(1).click();
  const modal = page.getByTestId("loadpoint-settings-modal");
  await expectModalVisible(modal);

  // Smart-Cost-Limit aktivieren
  const enableLimit = modal.getByLabel("Enable limit");
  await expect(enableLimit).toBeVisible();
  await enableLimit.check();
  await expect(enableLimit).toBeChecked();

  // Preislimit auf einen konkreten Wert setzen
  const priceLimit = modal.getByLabel("Price limit");
  await expect(priceLimit).toBeVisible();
  await priceLimit.selectOption({ index: 1 }); // Ersten verfügbaren Wert wählen

  // Modal schließen
  await modal.getByLabel("Close").click();
  await expectModalHidden(modal);

  // Smart-Cost-Status wird in der Fahrzeuganzeige gezeigt
  await expect(page.getByTestId("vehicle-status-smartcost")).toBeVisible();
});
