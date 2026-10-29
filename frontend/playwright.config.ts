import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://devices.localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1024 },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://devices.localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_ENV: "local",
      NEXT_PUBLIC_MOCK_DELAY_MS: "0",
      NEXT_PUBLIC_MOCK_TODAY: "2026-10-07",
      NEXT_PUBLIC_MOCK_SCENARIO: "default",
    },
  },
});
