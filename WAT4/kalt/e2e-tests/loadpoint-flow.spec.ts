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

test.describe("Loadpoint-Flow", () => {
  test("zeigt Titel und Live-Leistung", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Hello World" })).toBeVisible();
    await expect(page.getByTestId("visualization")).toContainText("1.0 kW");
  });

  test("zeigt genau einen Loadpoint", async ({ page }) => {
    await expect(page.getByTestId("loadpoint")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Carport" })).toBeVisible();
  });
});
