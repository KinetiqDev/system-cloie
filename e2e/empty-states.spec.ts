import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §50: empty/no-data states verified on the fixture — differentiated copy
 * instead of a generic "No data". Covers the landing filtered-empty message,
 * the zero-response evaluation detail state (also §61's zero-response
 * scenario), and the program-wide PO evidence gap.
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

  // General Education zero-response evidence belongs to the Coordinator.
  await loginAs(page, fx.demoGenEd.email);
  await page.goto(`/gen-ed-coordinator/responses/course/${fx.gestechEval.id}`);
  await expect(
    page.getByText("Evaluations exist, but no responses have been submitted.")
  ).toBeVisible();

  // Analytics Outcomes: central evidence exists but no central deployment
  // publishes a PO snapshot, so the program-wide section shows its
  // differentiated empty state.
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/analytics?tab=outcomes`);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await page.getByRole("combobox", { name: "Evidence source" }).click();
  await page.getByRole("option", { name: "Alumni" }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No program-wide PO evidence")).toBeVisible();
});
