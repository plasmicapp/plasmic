import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 8 : undefined,
  reporter: process.env.CI
    ? [["github"], ["playwright-ctrf-json-reporter", {}]]
    : [
        [
          "html",
          {
            host: "127.0.0.1",
            port: Number(process.env.PLAYWRIGHT_REPORTER_PORT ?? 9323),
            open: process.env.PLAYWRIGHT_REPORTER_OPEN ?? "on-failure",
          },
        ],
      ],
  timeout: 400_000,
  use: {
    actionTimeout: 10_000,
    baseURL: process.env.WAB_HOST ?? "http://localhost:3003",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.spec\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
