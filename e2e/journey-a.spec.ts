import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §61 Journey A (top-down):
 * Program Head login → Dashboard → stakeholder participation → Analytics →
 * Course → Evaluation → named respondent → exact quantitative answer →
 * exact qualitative answer.
 */
test("top-down journey: dashboard to exact answers", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.bsit.id}/dashboard`));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Dashboard → stakeholder participation (Students row links to Analytics).
  await page.getByRole("link", { name: /^Students: / }).click();
  await expect(page).toHaveURL(/tab=stakeholders/);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(page.getByText("Evidence sources are kept separate", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.assign(window, { __analyticsNavigationSentinel: "preserved" });
  });
  const documentNavigationCount = await page.evaluate(
    () => performance.getEntriesByType("navigation").length
  );

  // Analytics → Courses tab → evaluation evidence link.
  const analyticsViews = page.getByRole("navigation", { name: "Analytics views" });
  await analyticsViews.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/tab=courses/);
  await expect(page.getByRole("region", { name: "Course breakdown" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __analyticsNavigationSentinel?: string })
          .__analyticsNavigationSentinel
    )
  ).toBe("preserved");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(
    documentNavigationCount
  );

  // The exact-values table carries the Review Evidence links.
  const courseBreakdown = page.getByRole("region", { name: "Course breakdown" });
  await courseBreakdown.getByText("View exact values").click();
  await courseBreakdown.getByRole("link", { name: fx.courseEvaluation.title, exact: true }).click();

  // Evaluation detail → named respondent.
  await expect(page.getByRole("heading", { name: fx.courseEvaluation.title })).toBeVisible();
  // #586: the respondent's name is a plain cell; evidence opens through the
  // row's View Response action.
  await page
    .getByRole("row", { name: new RegExp(fx.courseResponse.respondentName) })
    .getByRole("link", { name: "View Response" })
    .click();

  // Individual response: exact quantitative answer.
  await expect(page.getByRole("heading", { name: fx.courseResponse.respondentName })).toBeVisible();
  const quantitative = fx.courseResponse.quantitative[0];
  const answerBlock = page.locator("p", { hasText: quantitative.prompt }).first().locator("..");
  await expect(answerBlock.getByText(String(quantitative.rating), { exact: true })).toBeVisible();

  // Exact qualitative answer.
  const qualitativeText = fx.courseResponse.qualitative[0].text;
  await expect(page.getByText(qualitativeText, { exact: true })).toBeVisible();
});
