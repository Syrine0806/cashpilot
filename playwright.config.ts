import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests (Page Object Model, see e2e/pages).
 * They run against a production build with a dedicated SQLite database,
 * reset and seeded before the server starts.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Africa/Tunis",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:./e2e.db", UPLOAD_DIR: "./storage/e2e-receipts" },
  },
});
