import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Sign in through the dev-auth cookie path (no OAuth UI automation):
 * POST /api/auth/dev-login sets the httpOnly cloie_dev_auth cookie in the
 * shared browser context, and the app resolves the session from it.
 */
export async function loginAs(page: Page, email: string): Promise<void> {
  const response = await page.request.post("/api/auth/dev-login", { data: { email } });
  expect(response.ok(), `dev-login failed for ${email}`).toBeTruthy();
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
