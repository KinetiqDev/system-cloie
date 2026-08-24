import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §29/§61: cross-Program denial — a Program Head assigned only to BEED must
 * not be able to open BSIT evidence surfaces; guessed/deep IDs must not
 * disclose data outside the assigned Program.
 */
test("BEED Program Head cannot open BSIT surfaces", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.beedPh.email);

  // BEED entry still works: /program-head redirects to the BEED dashboard.
  await page.goto("/program-head");
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.beed.id}/dashboard`));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Dashboard of another Program → not-found page (no data leak).
  await page.goto(`/program-head/programs/${fx.bsit.id}/dashboard`);
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
  await expect(page.getByText("Bachelor of Science in Information Technology")).not.toBeVisible();

  // Course evaluation detail of another Program → not-found.
  await page.goto(
    `/program-head/programs/${fx.bsit.id}/responses/course/${fx.courseEvaluation.id}`
  );
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();

  // Individual identified response of another Program → not-found.
  await page.goto(
    `/program-head/programs/${fx.bsit.id}/responses/course/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
  );
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();

  // Program-wide deployment of another Program → not-found.
  await page.goto(
    `/program-head/programs/${fx.bsit.id}/responses/program-wide/${fx.centralEvaluation.id}`
  );
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
});
