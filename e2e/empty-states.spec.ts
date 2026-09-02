import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §50: empty/no-data states verified on the fixture — differentiated copy
 * instead of a generic "No data". Covers the landing filtered-empty message,
 * the zero-response evaluation detail state (also §61's zero-response
 * scenario), and the program-wide PLO evidence gap.
 */
test("empty states differentiate the reason", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Responses landing: a search that matches nothing yields the
  // differentiated filtered-empty message.
  await page.getByRole("link", { name: "View Responses" }).first().click();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await page.getByPlaceholder(/Evaluation, course, or faculty/).fill("zzzz-no-match");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No matching evaluations", { exact: true })).toBeVisible();

  // Zero-response evaluation (§61): GESTECH has an eligible roster but no
  // submissions — the landing row says "No responses yet" and the detail
  // page renders the §50 zero-response empty state.
  await page.getByPlaceholder(/Evaluation, course, or faculty/).fill("");
  await page.getByRole("combobox", { name: "Response progress" }).click();
  await page.getByRole("option", { name: "No responses" }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  const emptyEvaluationRow = page.getByRole("row", {
    name: /GESTECH Post-Term CILO Evaluation.*First year.*Morning/i,
  });
  await expect(emptyEvaluationRow).toBeVisible();
  await expect(emptyEvaluationRow.getByText("None", { exact: true })).toBeVisible();
  await emptyEvaluationRow.getByRole("link", { name: "GESTECH Post-Term CILO Evaluation" }).click();
  await expect(
    page.getByText("Evaluations exist, but no responses have been submitted.")
  ).toBeVisible();

  // Analytics Outcomes: central evidence exists but no central deployment
  // publishes a PLO snapshot, so the program-wide section shows its
  // differentiated empty state.
  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await page.getByLabel("Evidence source").selectOption("ALUMNI");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No program-wide PLO evidence")).toBeVisible();
});
