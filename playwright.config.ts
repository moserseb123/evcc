import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  timeout: 60000, // 60s
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 4 : 0,
  reporter: [[process.env.CI ? "github" : "list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:7070",
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
    permissions: ["clipboard-write"],
    actionTimeout: 20000, // 20s for individual actions
  },
  projects: [
    {
      name: "chromium",
      testDir: ".",
      testMatch: [
        "tests/**/*.spec.ts",
        "WAT4/kalt/e2e-tests/**/*.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1400, height: 1400 },
      },
    },
    {
      name: "chromium-moser",
      testDir: "WAT4/moser/e2e-tests",
      testMatch: "**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1400, height: 1400 },
      },
    },
  ],
});
