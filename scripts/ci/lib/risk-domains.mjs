/**
 * Risk-domain classification for CI check selection (issue #551).
 *
 * Pure classifier: changed files → which check families a PR must run.
 * `.github/workflows/ci.yml` consumes the outputs through the `select` job;
 * `scripts/ci/select-checks.mjs` is the CLI wrapper. Keeping the mapping here
 * (instead of inline workflow expressions) makes the risk contract unit-testable.
 *
 * Mapping rules (parent spec #536, user stories 3/4):
 * - Documentation/config-only changes run quality checks only.
 * - Any application (`src/`) or browser-test change selects the browser suite.
 * - Schema/persistence changes select the database suite.
 * - Shared risk domains — auth, role, schema, navigation, response,
 *   publication, design-system — expand the selection so a narrow file change
 *   inside a shared module still receives the broader check set.
 * - CI verification machinery (workflow definitions, the selector itself)
 *   fails closed: it selects every production gate, because a change there
 *   could otherwise disable the checks meant to validate it.
 * - The curated visual baseline runs with the browser suite: its representative
 *   screens can be affected by any application change. The output stays a
 *   separate flag so CI can force-disable it (scheduled cross-browser runs)
 *   without changing the classifier.
 */

// Domain → path prefixes. A changed file joins every matching domain.
const DOMAIN_PREFIXES = {
  schema: ["prisma/", "supabase/", "src/lib/db/", "scripts/ci/apply-migrations.sh"],
  auth: ["src/features/auth/", "src/lib/supabase/", "src/proxy.ts"],
  role: ["src/features/users/"],
  response: ["src/features/responses/", "src/features/response-review/"],
  publication: ["src/features/evaluations/", "src/features/course-assignments/"],
  navigation: ["src/app/", "src/components/layout/"],
  "design-system": ["src/styles/", "src/components/", "src/features/design-system/"],
};

// Shared domains whose changes must expand the selection to the database suite
// (parent spec: auth, role, schema, navigation, response, publication,
// design-system must not receive an unsafe narrow run).
const SHARED_DATABASE_DOMAINS = ["schema", "auth", "role", "response", "publication"];

// Paths that select the browser suite: application code and browser-test infra.
const BROWSER_PREFIXES = ["src/", "e2e/", "playwright.config.ts"];

// Fail-closed: the CI verification machinery itself — workflow definitions and
// the check-selection implementation — decides which gates run. A PR that
// touches it selects every production gate instead of trusting the mechanism
// being modified.
const CI_INFRASTRUCTURE_PREFIXES = [".github/workflows/", "scripts/ci/"];

// Paths that select the production build.
const BUILD_PREFIXES = [
  "src/",
  "prisma/",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "next.config.",
  "tsconfig.json",
  "package.json",
  "pnpm-lock.yaml",
  "Dockerfile",
  ".dockerignore",
  "postcss.config.",
];

function matchesAny(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix));
}

/**
 * @param {string[]} changedFiles repository-relative changed paths
 * @param {{ all?: boolean }} options force the full matrix (scheduled runs)
 * @returns {{ run_build: boolean, run_database: boolean, run_browser: boolean, run_visual: boolean, domains: string[] }}
 */
export function selectChecks(changedFiles, options = {}) {
  if (options.all) {
    return {
      run_build: true,
      run_database: true,
      run_browser: true,
      run_visual: true,
      domains: ["full-matrix"],
    };
  }

  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const domains = [];
  for (const [domain, prefixes] of Object.entries(DOMAIN_PREFIXES)) {
    if (files.some((file) => matchesAny(file, prefixes))) domains.push(domain);
  }
  if (files.some((file) => matchesAny(file, ["src/"]))) domains.push("application");

  const touchesCiInfrastructure = files.some((file) =>
    matchesAny(file, CI_INFRASTRUCTURE_PREFIXES)
  );
  if (touchesCiInfrastructure) domains.push("ci-infrastructure");

  const runBrowser =
    touchesCiInfrastructure || files.some((file) => matchesAny(file, BROWSER_PREFIXES));
  const runDatabase =
    touchesCiInfrastructure || SHARED_DATABASE_DOMAINS.some((domain) => domains.includes(domain));
  const runBuild =
    touchesCiInfrastructure || files.some((file) => matchesAny(file, BUILD_PREFIXES));

  return {
    run_build: runBuild,
    run_database: runDatabase,
    run_browser: runBrowser,
    run_visual: runBrowser,
    domains,
  };
}
