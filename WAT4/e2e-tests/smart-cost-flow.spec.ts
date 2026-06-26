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
 * E2E-2: Smart-Cost-Threshold erlaubt Ladestart (Playwright)
 *
 * Getestetes Szenario:
 *   1. Fahrzeug verbunden, aber noch nicht ladend (PV-Strom verfügbar, Smart-Cost noch offen)
 *   2. Smart-Cost-Threshold auf ≤ 40 ct/kWh setzen (Strom-Tarif: 20–40 ct/kWh)
 *      → aktueller Preis liegt UNTER dem Threshold → Smart-Cost-Gate öffnet sich
 *   3. PV-Modus wählen → PV-Strom verfügbar + Smart-Cost erlaubt → Lade-Freigabe
 *   4. Simulator: Wallbox startet Laden
 *   5. UI: "Charging…" + Smart-Cost-Statusanzeige mit Preis-vs-Limit-Vergleich
 *
 */
test("Smart-Cost-Threshold erlaubt Ladestart wenn Preis unter dem Limit liegt", async ({
  page,
}) => {
  // Simulator: kein PV-Strom verfügbar; Fahrzeug verbunden, aber NICHT ladend
  await page.goto(simulatorUrl());
  await page.getByLabel("PV Power").fill("0");
  await page.getByTestId("loadpoint0").getByText("B (connected)").click();
  await page.getByTestId("loadpoint0").getByText("Enabled").check();
  await simulatorApply(page);

  // Fahrzeug verbunden, kein aktiver Ladevorgang
  await page.goto("/");
  const loadpoint = page.getByTestId("loadpoint");
  await expect(loadpoint).toBeVisible();
  await expect(page.getByTestId("vehicle-status-charger")).toContainText("Connected");

  // Ladepunkt-Einstellungen öffnen
  await page.getByTestId("loadpoint-settings-button").nth(1).click();
  const modal = page.getByTestId("loadpoint-settings-modal");
  await expectModalVisible(modal);

  // Smart-Cost-Limit aktivieren: ≤ 40 ct/kWh
  // Simulator-Tarif: 40 ct/kWh → aktueller Preis ≤ 40 ct → Laden erlaubt
  await modal.getByLabel("Enable limit").check();
  await modal.getByLabel("Price limit").selectOption("≤ 40.0 ct/kWh");

  await modal.getByLabel("Close").click();
  await expectModalHidden(modal);

  // PV-Modus wählen (2. Button)
  // Preis ≤ 40 ct → Lade-Freigabe erteilt
  await page.getByTestId("mode").getByRole("button").nth(1).click();

  // Simulator: Wallbox reagiert auf Lade-Freigabe → Zustand C (charging)
  await page.goto(simulatorUrl());
  await page.getByTestId("loadpoint0").getByText("C (charging)").click();
  await simulatorApply(page);

  // Ladevorgang aktiv + Smart-Cost-Status zeigt Preis ≤ Limit
  await page.goto("/");
  await expect(page.getByTestId("vehicle-status-charger")).toContainText("Charging");
  await expect(page.getByTestId("vehicle-status-smartcost")).toHaveText(/≤ 40\.0 ct/);
});
