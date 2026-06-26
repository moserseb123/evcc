import { test, expect } from "@playwright/test";
import { start, stop, baseUrl } from "../../../tests/evcc";

test.use({ baseURL: baseUrl() });

test.beforeAll(async () => {
  await start("basics.evcc.yaml");
});
test.afterAll(async () => {
  await stop();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Ladeplanung", () => {
  test("Nutzer öffnet die Ladeplanung", async ({ page }) => {
    await page.getByTestId("charging-plan-button").first().click();
    await expect(page.getByTestId("charging-plan-modal")).toBeVisible();
  });

  test("Ladeplan erlaubt Zeit und Energiemenge festzulegen", async ({ page }) => {
    await page.getByTestId("charging-plan-button").first().click();
    const modal = page.getByTestId("charging-plan-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("static-plan-time")).toBeVisible();
    await expect(modal.getByTestId("static-plan-energy")).toBeVisible();
  });
});
