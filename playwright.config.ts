import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Browser-level Program Head evidence journeys (§61).
 *
 * In local development the app runs as a Next.js dev server so the dev-auth
 * cookie path (resolve-auth-session.ts → readDevAuthCookie) is available.
 * In CI the critical journeys run against the production runtime (`next build`
 * + `next start`) with the isolated signed CI test session
 * (cloie_ci_test_auth) restricted to the disposable seeded database — no OAuth
 * UI automation. The database is the disposable Postgres seeded by the same
 * fixture the database-integration job uses; the global setup uses the
 * reviewed deterministic contract in `e2e/support/contract.ts` (SystemRole
 * `U.*` and deployment `D.*` identifiers reused from the Prisma seed) and
 * verifies the seed rows match before any browser journey starts — the
 * expectations are pinned, not derived from the same database read being
 * checked.
 */
const isCiTestProduction = process.env.CLOIE_CI_TEST_ENABLED === "true";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  // Required checks keep retries disabled; flaky red-then-green is not reported as clean.
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: isCiTestProduction ? "pnpm build && pnpm start -p 3100" : "pnpm dev -p 3100",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: isCiTestProduction
      ? {
          NODE_ENV: "production",
        }
      : undefined,
  },
});
