// fallow-ignore-file code-duplication
import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, expectNoHorizontalOverflow, loginAs } from "./support/helpers";

/**
 * Issue #625 / ADR 0025: a Program-wide template with unbound Likert questions
 * publishes, and the publish step names them on a phone viewport. The
 * institution-owned exit-survey baseline carries no GO bindings at all, so
 * every Likert question publishes as a general evaluation item.
 */

function localDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test("mobile publish names unbound GO questions and publishes", async ({ page }) => {
  const fx = fixture();
  const baseline = fx.programWideUnboundBaseline;
  const deploymentName = `BSIT Exit Survey (Mobile ${Date.now()})`;

  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/tools/publish`);
  await expect(page.getByRole("heading", { name: "Publish Evaluation Tool" })).toBeVisible();

  await page.getByLabel("Deployed Evaluation Name").fill(deploymentName);
  await page.getByRole("combobox", { name: "Evaluation Template" }).click();
  await page.getByRole("option", { name: baseline.templateName, exact: true }).click();

  // No GO bindings: the coverage panel states the count and folds the list.
  await expect(page.getByRole("heading", { name: "GO coverage" })).toBeVisible();
  await expect(
    page.getByText(`0 of ${baseline.likertCount} Likert questions bound to a GO.`)
  ).toBeVisible();
  await expect(
    page.getByText(/publish as general evaluation items and give no GO evidence/i)
  ).toBeVisible();
  await expect(page.getByText(`Show all ${baseline.likertCount} unbound questions`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Assign GOs in the template editor" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("combobox", { name: "Academic Term" }).click();
  await page
    .getByRole("option", { name: /2027-2028/ })
    .first()
    .click();
  await page.getByRole("radio", { name: "Alumni", exact: true }).click();

  const now = Date.now();
  await page
    .locator("#activation_at")
    .fill(localDateTimeInputValue(new Date(now - 24 * 60 * 60 * 1000)));
  await page
    .locator("#deadline_at")
    .fill(localDateTimeInputValue(new Date(now + 90 * 24 * 60 * 60 * 1000)));

  await page.getByRole("button", { name: "Preview Respondents" }).click();
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  await expect(page.getByText(/respondent\(s\) found/)).toBeVisible();
  // The decision point carries the same coverage panel: configure + preview.
  await expect(page.getByRole("heading", { name: "GO coverage" })).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Confirm and Publish" }).click();
  await expect(page).toHaveURL(/tab=published/);
  await expect(page.getByText(/Deployment published successfully/)).toBeVisible();
});
