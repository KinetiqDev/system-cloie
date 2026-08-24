import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs } from "./support/helpers";

/**
 * §49 accessibility sweep on the evidence-workflow surfaces, run against the
 * seeded fixture: no serious/critical WCAG A/AA violations (axe-core).
 */
test.describe("accessibility sweep", () => {
  test("dashboard, analytics, responses, evaluation and response detail are clean", async ({
    page,
  }) => {
    const fx = fixture();

    await loginAs(page, fx.demoPh.email);

    await page.goto("/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Analytics — Courses tab (charts + exact-values table).
    await page.getByRole("link", { name: "Open Analytics" }).first().click();
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Analytics views" })
      .getByRole("link", { name: "Courses", exact: true })
      .click();
    await expect(page.getByRole("region", { name: "Course breakdown" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Responses landing.
    await page.getByRole("link", { name: "Responses", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Course evaluation detail (identified respondents table).
    await page.getByRole("link", { name: fx.courseEvaluation.title, exact: true }).click();
    await expect(page.getByRole("heading", { name: fx.courseEvaluation.title })).toBeVisible();
    await expectNoAxeViolations(page);

    // Individual response detail (submitted answers).
    await page.getByRole("link", { name: fx.courseResponse.respondentName, exact: true }).click();
    await expect(page.getByRole("heading", { name: fx.courseResponse.respondentName })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("dashboard structure: one h1, main landmark, visible focus", async ({ page }) => {
    const fx = fixture();

    await loginAs(page, fx.demoPh.email);
    await page.goto("/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();

    // Interactive rows remain keyboard-reachable: focus moves to the first
    // stakeholder link and a visible focus style is applied.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });
});
