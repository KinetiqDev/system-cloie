import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function getAuthLoginEndpoint(): string {
  return process.env.CLOIE_CI_TEST_ENABLED === "true"
    ? "/api/auth/ci-test-login"
    : "/api/auth/dev-login";
}

/**
 * Sign in through the isolated test-auth cookie path (no OAuth UI automation):
 * In development: POST /api/auth/dev-login sets the httpOnly cloie_dev_auth cookie.
 * In production CI: POST /api/auth/ci-test-login sets the httpOnly cloie_ci_test_auth cookie
 * (isolated signed session restricted to the disposable seeded catalog). Both paths
 * resolve through the normal System CLOIE session and authorization (account state,
 * SystemRole, Authorized Program, Course Assignment, roster, eligibility).
 */
export async function loginAs(page: Page, email: string): Promise<void> {
  const endpoint = getAuthLoginEndpoint();
  const response = await page.request.post(endpoint, { data: { email } });
  expect(response.ok(), `${endpoint} failed for ${email}`).toBeTruthy();
}

/** §49 accessibility sweep: no serious/critical WCAG A/AA violations. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  const summary = blocking.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}
