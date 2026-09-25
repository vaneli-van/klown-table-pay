import { defineConfig, devices } from "@playwright/test";

// Klown marketing + Admin Central (klown-table-pay) smoke config.
// TanStack Start SSR build (nitro/Cloudflare target), so we test against
// `vite dev`. Readiness is probed against a static asset.

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `bun run dev --port ${PORT} --host 127.0.0.1`,
    url: `${BASE_URL}/robots.txt`,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
