import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs, respondentRow } from "./support/helpers";

/**
 * §61 Journey B (bottom-up):
 * Individual response → CILO → PO → Outcomes Analytics → Dashboard.
 */
test("bottom-up journey: answer to PO evidence and back to dashboard", async ({ page }) => {
  const fx = fixture();
  const poLink = fx.bottomUpResponse.poLinks[0];

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

  // CILO badge → PO link → Outcomes Analytics scoped to that PO.
  // The reviewed PO code (BSIT-GO1) is the evidence expectation; the PO id
  // is a runtime handle discovered in global-setup so the URL is pinned to
  // the reviewed PO without deriving the expectation from the read under test.
  await expect(page.getByText(`CILO: ${poLink.ciloLabel}`, { exact: false })).toBeVisible();
  await page.getByRole("link", { name: poLink.poCode, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`poId=${poLink.poId}`));
  await expect(page).toHaveURL(/tab=outcomes/);
  await expect(page.getByText("Exact values by Program Outcome")).toBeVisible();
  await expect(page.getByText(poLink.poCode, { exact: true }).first()).toBeVisible();

  // Outcomes Analytics → Dashboard.
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/program-head/programs/${fx.bsit.id}/dashboard`));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
