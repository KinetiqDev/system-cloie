import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Browser-level critical workflows and the curated visual baseline (#551).
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
 *
 * Check selection (#551):
 * - `CLOIE_E2E_BROWSERS` picks the engine projects for this run (default
 *   `chromium` = the required PR matrix: desktop + mobile). The scheduled deep
 *   run adds `firefox`/`webkit` cross-browser jobs.
 * - `CLOIE_E2E_VISUAL=false` drops the `@visual` curated screenshot baseline
 *   from the run (used by cross-browser jobs and by PR CI when the risk
 *   selection excludes the visual gate). Unset/`true` keeps it.
 * - Required checks keep retries disabled; a red-then-green run is treated as
 *   flaky evidence, not a clean pass. Sharding stays out until a measured
 *   suite runtime justifies it (workers: 1, serial mutating journeys).
 */
const isCiTestProduction = process.env.CLOIE_CI_TEST_ENABLED === "true";

const selectedBrowsers = (process.env.CLOIE_E2E_BROWSERS ?? "chromium")
  .split(",")
  .map((browser) => browser.trim())
  .filter(Boolean);
const includeVisual = process.env.CLOIE_E2E_VISUAL !== "false";

function projectFor(browser: string) {
  switch (browser) {
    case "chromium":
      return [
        {
          name: "desktop",
          use: { ...devices["Desktop Chrome"] },
          testIgnore: /mobile.*\.spec\.ts/,
        },
        {
          name: "mobile",
          use: { ...devices["Pixel 7"] },
          testMatch: /mobile.*\.spec\.ts/,
        },
      ];
    case "firefox":
      return [
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
          testIgnore: /mobile.*\.spec\.ts/,
        },
      ];
    case "webkit":
      return [
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
          testIgnore: /mobile.*\.spec\.ts/,
        },
      ];
    default:
      throw new Error(`Unknown CLOIE_E2E_BROWSERS entry: ${browser}`);
  }
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  // Required checks keep retries disabled; flaky red-then-green is not reported as clean.
  retries: 0,
  timeout: 90_000,
  expect: {
    // Shared runners can stall client-side commits and renders for up to
    // ~18s while the app itself stays healthy; retries stay disabled, so
    // assertions wait out the stall instead of expiring at the old 15s mark.
    timeout: 30_000,
    // Curated visual baseline (#551): deterministic rendering — animations are
    // fast-forwarded, the caret hidden, and the visual.css sheet neutralizes
    // transitions so reduced-motion emulation and CI timing cannot produce
    // false diffs. A small pixel-ratio tolerance absorbs font rasterizer noise
    // across runner images without masking layout or content changes.
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03,
      stylePath: "e2e/support/visual.css",
    },
  },
  grepInvert: includeVisual ? undefined : /@visual/,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 120_000,
  },
  projects: selectedBrowsers.flatMap(projectFor),
  webServer: {
    command: isCiTestProduction ? `pnpm build && pnpm start -p ${PORT}` : `pnpm dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: isCiTestProduction
      ? {
          ...process.env,
          NODE_ENV: "production",
          CLOIE_PRIMARY_SUPABASE_PROJECT_REF: "",
          CLOIE_DEMO_SUPABASE_PROJECT_REF: "",
        }
      : undefined,
  },
});
