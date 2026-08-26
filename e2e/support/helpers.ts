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
  // Let any in-flight RSC, session refresh, or route transition settle before
  // scanning. The Next.js App Router may set aria-busy on <html> during
  // transitions, which axe flags as aria-prohibited-attr on :root if scanned
  // mid-transition; this also ensures the stable page state is scanned instead
  // of a loading shell (§19 testing decision).
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    const root = document.documentElement;
    return Array.from(root.attributes).every((attribute) => !attribute.name.startsWith("aria-"));
  });
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

/**
 * Student wizard Likert interaction: click the descriptor label inside the
 * radiogroup for the given prompt (mirrors a real user choosing a rating).
 */
export async function rateQuestion(page: Page, prompt: string, label: string): Promise<void> {
  const group = page.getByRole("group", { name: prompt });
  await group.getByText(label, { exact: true }).click();
  await expect(group.getByRole("radio", { name: label, exact: true })).toBeChecked();
}

/** Assert a student wizard Likert question has no selected rating. */
export async function expectQuestionUnanswered(page: Page, prompt: string): Promise<void> {
  const group = page.getByRole("group", { name: prompt });
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(0);
}

/** Horizontal-overflow guard: no document/body scroll width beyond the viewport. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth - window.innerWidth, body.scrollWidth - window.innerWidth);
  });
  expect(overflow, `horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(0);
}
