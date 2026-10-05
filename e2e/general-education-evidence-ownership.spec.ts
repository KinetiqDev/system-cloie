import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, expectNoHorizontalOverflow, loginAs } from "./support/helpers";

for (const width of [1440, 393]) {
  test(`General Education review belongs to the Coordinator at ${width}px`, async ({ page }) => {
    const fx = fixture();
    const ge = fx.generalEducationReview;
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, fx.demoGenEd.email);
    await page.goto("/gen-ed-coordinator/dashboard");
    await page
      .getByRole("link", { name: /responses/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/gen-ed-coordinator\/responses/);
    await page.locator(`a[href*="/responses/course/${ge.evaluationId}"]:visible`).click();
    await expect(page).toHaveURL(new RegExp(`/responses/course/${ge.evaluationId}`));
    await expect(
      page.getByText(ge.respondentName, { exact: true }).filter({ visible: true })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    await page.goto(
      `/gen-ed-coordinator/responses/course/${ge.evaluationId}/responses/${ge.responseId}`
    );
    await expect(page.getByText(ge.respondentName, { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    await page.goto(
      `/gen-ed-coordinator/responses/course/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
    );
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    await expect(page.getByText(fx.courseResponse.respondentName, { exact: true })).toHaveCount(0);

    await loginAs(page, fx.demoPh.email);
    await page.goto(`/program-head/programs/${fx.bsit.id}/responses`);
    await expect(page.getByRole("link", { name: ge.title, exact: true })).toHaveCount(0);
    await page.goto(`/program-head/programs/${fx.bsit.id}/responses/course/${ge.evaluationId}`);
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    await page.goto(
      `/program-head/programs/${fx.bsit.id}/responses/course/${ge.evaluationId}/responses/${ge.responseId}`
    );
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    await expect(page.getByText(ge.respondentName, { exact: true })).toHaveCount(0);

    await page.goto(`/program-head/programs/${fx.bsit.id}/analytics?tab=courses`);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByText("GEETHICS", { exact: true })).toHaveCount(0);
    await expect(page.getByText("GESTECH", { exact: true })).toHaveCount(0);
  });
}
