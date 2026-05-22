import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "sibi/Tests",
  testMatch: "sibi-ownership-workbench.e2e.spec.ts",
  outputDir: "/private/tmp/sibi-playwright-results",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm run sibi:dev",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
