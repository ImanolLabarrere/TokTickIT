import { defineConfig, devices } from "@playwright/test";

// Lab 2 Issue 6 — start the server (npm run dev in /server, port 3000) and
// the client (npm run dev in /client, port 5173) yourself before running
// `npm run test:e2e`. Keeping this manual avoids flaky auto-start behavior
// across two separate dev servers on Windows.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
