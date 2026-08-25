import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §61 Journey B (bottom-up):
 * Individual response → CILO → PLO → Outcomes Analytics → Dashboard.
 */
test("bottom-up journey: answer to PLO evidence and back to dashboard", async ({ page }) => {
  const fx = fixture();
  const ploLink = fx.bottomUpResponse.ploLinks[0];

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.bsit.id}/dashboard`));

  // Reach the individual response through the Responses hub.
  await page.getByRole("link", { name: "View Responses" }).first().click();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await page.getByRole("link", { name: fx.bottomUpEvaluation.title, exact: true }).click();
  await expect(page.getByRole("heading", { name: fx.bottomUpEvaluation.title })).toBeVisible();
  await page
    .getByRole("link", { name: fx.bottomUpResponse.respondentName, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: fx.bottomUpResponse.respondentName })
  ).toBeVisible();

  // CILO badge → PLO link → Outcomes Analytics scoped to that PLO.
  // The reviewed PLO code (BSIT-GO1) is the evidence expectation; the PLO id
  // is a runtime handle discovered in global-setup so the URL is pinned to
  // the reviewed PLO without deriving the expectation from the read under test.
  await expect(page.getByText(`CILO: ${ploLink.ciloLabel}`, { exact: false })).toBeVisible();
  await page.getByRole("link", { name: ploLink.ploCode, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`ploId=${ploLink.ploId}`));
  await expect(page).toHaveURL(/tab=outcomes/);
  await expect(page.getByText("Exact values by Program Learning Outcome")).toBeVisible();
  await expect(page.getByText(ploLink.ploCode, { exact: true }).first()).toBeVisible();

  // Outcomes Analytics → Dashboard.
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.bsit.id}/dashboard`));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
