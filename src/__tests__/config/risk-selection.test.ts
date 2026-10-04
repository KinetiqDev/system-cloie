import { describe, expect, it } from "vitest";

import { selectChecks } from "../../../scripts/ci/lib/risk-domains.mjs";

/**
 * Risk-domain CI selection contract (issue #551, AC 5).
 *
 * PR CI selects browser, database, build, and UI checks from changed risk
 * domains. Shared auth, role, schema, navigation, response, publication, and
 * design-system changes expand the selection instead of receiving a narrow
 * run. CI verification machinery (workflow definitions, the selector itself)
 * fails closed to the full matrix: a change there could otherwise disable the
 * gates meant to validate it. The classifier is a pure function so the
 * mapping itself is unit-tested and the CI workflow only consumes its outputs.
 */
describe("risk-domain check selection (551)", () => {
  it("selects nothing beyond quality checks for documentation-only changes", () => {
    const selection = selectChecks(["README.md", "docs/testing/notes.md", ".agents/skills/x.md"]);
    expect(selection).toEqual({
      run_build: false,
      run_database: false,
      run_browser: false,
      run_visual: false,
      run_auth_integration: false,
      domains: [],
    });
  });

  it("selects build and browser for ordinary application code", () => {
    const selection = selectChecks(["src/features/portals/components/dashboard-card.tsx"]);
    expect(selection.run_build).toBe(true);
    expect(selection.run_browser).toBe(true);
    expect(selection.run_database).toBe(false);
    expect(selection.domains).toContain("application");
  });

  it("expands schema changes to database checks", () => {
    for (const file of [
      "prisma/schema.prisma",
      "supabase/migrations/20260101_init.sql",
      "src/lib/db/client.ts",
      "prisma/seed/fixtures/users.ts",
    ]) {
      const selection = selectChecks([file]);
      expect(selection.run_database, file).toBe(true);
      expect(selection.domains, file).toContain("schema");
    }
  });

  it("expands shared auth, role, response, and publication domains to database checks", () => {
    const shared = [
      "src/features/auth/lib/resolve-auth-session.ts",
      "src/features/users/services/create-account.ts",
      "src/features/responses/services/submit-response.ts",
      "src/features/response-review/lib/anonymize.ts",
      "src/features/evaluations/services/publish-deployment.ts",
    ];
    for (const file of shared) {
      const selection = selectChecks([file]);
      expect(selection.run_database, file).toBe(true);
      expect(selection.run_browser, file).toBe(true);
    }
  });

  it("selects the visual baseline for design-system and layout surfaces", () => {
    for (const file of [
      "src/styles/tokens.css",
      "src/app/globals.css",
      "src/components/ui/card.tsx",
      "src/features/design-system/components/showcase.tsx",
      "src/components/layout/app-shell.tsx",
    ]) {
      const selection = selectChecks([file]);
      expect(selection.run_visual, file).toBe(true);
    }
    expect(selectChecks(["src/styles/tokens.css"]).domains).toContain("design-system");
  });

  it("routes navigation changes through the shared-domain expansion", () => {
    const selection = selectChecks(["src/app/(app)/dashboard/page.tsx"]);
    expect(selection.run_browser).toBe(true);
    expect(selection.run_visual).toBe(true);
    expect(selection.domains).toContain("navigation");
  });

  it("selects browser checks for browser-test infrastructure changes", () => {
    for (const file of [
      "e2e/student-lifecycle.spec.ts",
      "playwright.config.ts",
      "e2e/support/helpers.ts",
    ]) {
      const selection = selectChecks([file]);
      expect(selection.run_browser, file).toBe(true);
    }
    // Playwright infrastructure does not affect the production build.
    const selection = selectChecks(["e2e/support/helpers.ts"]);
    expect(selection.run_build).toBe(false);
  });

  it("selects build for production configuration and dependency changes", () => {
    for (const file of [
      "next.config.ts",
      "instrumentation.ts",
      "instrumentation-client.ts",
      "package.json",
      "pnpm-lock.yaml",
      "tsconfig.json",
      "postcss.config.mjs",
      "Dockerfile",
      ".dockerignore",
    ]) {
      const selection = selectChecks([file]);
      expect(selection.run_build, file).toBe(true);
    }
  });

  it("reports every domain that contributed to the selection", () => {
    const selection = selectChecks([
      "src/features/responses/services/submit-response.ts",
      "src/styles/tokens.css",
      "prisma/schema.prisma",
    ]);
    expect(selection.domains.slice().sort()).toEqual(
      ["application", "design-system", "response", "schema"].sort()
    );
  });

  it("keeps repository scripts out of the production build", () => {
    const selection = selectChecks(["scripts/run-database-tests.ts"]);
    expect(selection.run_build).toBe(false);
  });

  it("fails closed to the full matrix when CI verification machinery changes", () => {
    const ciFiles = [
      ".github/workflows/ci.yml",
      ".github/workflows/scheduled.yml",
      "scripts/ci/select-checks.mjs",
      "scripts/ci/lib/risk-domains.mjs",
      "scripts/ci/lib/changed-files.mjs",
    ];
    for (const file of ciFiles) {
      const selection = selectChecks([file]);
      expect(selection.run_build, file).toBe(true);
      expect(selection.run_database, file).toBe(true);
      expect(selection.run_browser, file).toBe(true);
      expect(selection.run_visual, file).toBe(true);
      expect(selection.run_auth_integration, file).toBe(true);
      expect(selection.domains, file).toContain("ci-infrastructure");
    }
  });

  it("selects the real Auth gate for credential, template, and Auth config changes", () => {
    // A signed CI cookie bypasses GoTrue, so password, six-digit code, and
    // recovery are only proved by the real-Auth gate. Any change that can
    // alter those paths must select it.
    for (const file of [
      "src/features/auth/services/resolve-auth-method.ts",
      "src/app/api/auth/callback/route.ts",
      "src/features/legal/services/require-legal-acknowledgement.ts",
      "src/features/users/services/resolve-profile-gate.ts",
      "src/__tests__/auth/external-auth-real-gotrue.test.ts",
      "package.json",
      "pnpm-lock.yaml",
      "src/lib/actions/external-entry-actions.ts",
      "src/lib/schemas/external-entry.ts",
      "src/features/entry/components/verify-email-form.tsx",
      "supabase/config.toml",
      "public/auth-email/confirm_signup.html",
      "public/auth-email/recovery.html",
      "supabase/migrations/20260927090000_add_faculty_access_requests.sql",
    ]) {
      expect(selectChecks([file]).run_auth_integration, file).toBe(true);
    }
    // Unrelated application code must not pay for the Docker gate.
    expect(
      selectChecks(["src/features/portals/components/dashboard-card.tsx"]).run_auth_integration
    ).toBe(false);
    expect(selectChecks(["README.md"]).run_auth_integration).toBe(false);
  });

  it.each([
    "src/lib/actions/faculty-actions.ts",
    "src/lib/actions/faculty-approval-actions.ts",
    "src/lib/actions/onboarding-actions.ts",
    "src/lib/actions/alumni-actions.ts",
    "src/lib/actions/industry-partner-actions.ts",
    "src/lib/actions/external-entry-actions.ts",
  ])("selects database and real Auth checks for the direct identity writer %s", (file) => {
    const selection = selectChecks([file]);
    expect(selection.run_database).toBe(true);
    expect(selection.run_auth_integration).toBe(true);
  });

  it("selects everything when the caller forces the full matrix", () => {
    const selection = selectChecks(["README.md"], { all: true });
    expect(selection.run_build).toBe(true);
    expect(selection.run_database).toBe(true);
    expect(selection.run_browser).toBe(true);
    expect(selection.run_visual).toBe(true);
    expect(selection.run_auth_integration).toBe(true);
    expect(selection.domains).toContain("full-matrix");
  });

  it("treats an empty changed-file set as quality-only", () => {
    const selection = selectChecks([]);
    expect(selection.run_build).toBe(false);
    expect(selection.run_database).toBe(false);
    expect(selection.run_browser).toBe(false);
    expect(selection.run_visual).toBe(false);
    expect(selection.run_auth_integration).toBe(false);
  });
});
