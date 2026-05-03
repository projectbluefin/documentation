import { defineConfig, devices } from "@playwright/test";

const serveCommand = process.env.CI
  ? "npx docusaurus serve --port 3000 --no-open"
  : "npx docusaurus start --port 3000 --no-open";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox and WebKit are available for local testing only.
    // CI installs only Chromium to keep E2E runs fast.
    ...(!process.env.CI
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
  webServer: {
    command: serveCommand,
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
