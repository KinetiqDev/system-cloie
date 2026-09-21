import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs, respondentRow } from "./support/helpers";

/**
 * §61 Journey B (bottom-up):
 * Individual response → CILO → GO → Outcomes Analytics → Dashboard.
 */
test("bottom-up journey: answer to GO evidence and back to dashboard", async ({ page }) => {
  const fx = fixture();
  const goLink = fx.bottomUpResponse.goLinks[0];

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.bsit.id}/dashboard`));

  // Reach the individual response through the Responses hub.
  await page.getByRole("link", { name: "View Responses" }).first().click();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await page.getByRole("link", { name: fx.bottomUpEvaluation.title, exact: true }).click();
  await expect(page.getByRole("heading", { name: fx.bottomUpEvaluation.title })).toBeVisible();
  await respondentRow(page, fx.bottomUpResponse.respondentName)
    .getByRole("link", { name: "View Response" })
    .click();
  await expect(
    page.getByRole("heading", { name: fx.bottomUpResponse.respondentName })
  ).toBeVisible();

  // CILO badge → GO link → Outcomes Analytics scoped to that GO.
  // The reviewed GO code (BSIT-GO1) is the evidence expectation; the GO id
  // is a runtime handle discovered in global-setup so the URL is pinned to
  // the reviewed GO without deriving the expectation from the read under test.
  await expect(page.getByText(`CILO: ${goLink.ciloLabel}`, { exact: false })).toBeVisible();
  await page.getByRole("link", { name: goLink.goCode, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`goId=${goLink.goId}`));
  await expect(page).toHaveURL(/tab=outcomes/);
  await expect(page.getByText("Exact values by Graduate Outcome")).toBeVisible();
  await expect(page.getByText(goLink.goCode, { exact: true }).first()).toBeVisible();

  // Outcomes Analytics → Dashboard.
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.bsit.id}/dashboard`));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
