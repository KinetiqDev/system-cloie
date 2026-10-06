import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, expectNoHorizontalOverflow, loginAs } from "./support/helpers";

for (const width of [1440, 393]) {
  test(`Coordinator follows ILO evidence to submitted answers at ${width}px`, async ({ page }) => {
    const fx = fixture();
    const ge = fx.generalEducationReview;
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, fx.demoGenEd.email);
    const scope = new URLSearchParams({ courseId: ge.courseId, termInstanceId: ge.termInstanceId });
    await page.goto(`/gen-ed-coordinator/analytics?${scope}`);
    await expect(
      page.getByRole("heading", { name: "General Education analytics", exact: true })
    ).toBeVisible();
    const exact = page.getByRole("table", {
      name: "Exact values by institutional learning outcome",
    });
    for (const ilo of ge.iloEvidence) {
      const row = exact.locator(`tr[data-outcome-row="${ilo.id}"]`);
      await expect(row).toContainText(ilo.code);
      await expect(row).toContainText(ilo.meanRating.toFixed(2));
      await expect(row).toContainText(String(ilo.ratingCount));
    }
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    for (const [tab, label] of [
      ["courses", "Courses"],
      ["programs", "Programs"],
      ["trends", "Trends"],
      ["qualitative", "Written feedback"],
    ] as const) {
      await page
        .getByRole("navigation", { name: "Analytics views" })
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
      await expect(page).toHaveURL(new RegExp(`courseId=${ge.courseId}`));
      await expectNoHorizontalOverflow(page);
    }

    const ilo = ge.iloEvidence[0];
    const reviewScope = new URLSearchParams({
      iloId: ilo.id,
      termInstanceId: ge.termInstanceId,
      programId: ge.programId,
      completion: "complete",
    });
    await page.goto(`/gen-ed-coordinator/responses?${reviewScope}`);
    await page.locator(`a[href*="/responses/course/${ge.evaluationId}"]:visible`).first().click();
    await expect(page).toHaveURL(new RegExp(`/responses/course/${ge.evaluationId}`));
    await expect(page.getByText("ILO alignments", { exact: true })).toBeVisible();
    await page.goto(
      `/gen-ed-coordinator/responses/course/${ge.evaluationId}/responses/${ge.responseId}`
    );
    await expect(page.getByText(ge.respondentName, { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: ilo.code, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`iloId=${ilo.id}`));
    await expect(page.locator(`tr[data-outcome-row="${ilo.id}"]`).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });
}
