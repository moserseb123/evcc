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

test.describe("Navigation", () => {
  test("untere Tab-Leiste ist sichtbar", async ({ page }) => {
    await expect(page.getByTestId("bottom-tab-bar")).toBeVisible();
  });

  test("wechselt zur Sessions-Ansicht", async ({ page }) => {
    await page.getByTestId("bottom-tab-bar").getByRole("link", { name: "Sessions" }).click();
    await expect(page).toHaveURL(/sessions/);
  });
});
