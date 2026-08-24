import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §50: empty/no-data states verified on the fixture — differentiated copy
 * instead of a generic "No data".
 */
test("empty states differentiate the reason", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Responses landing: every seeded evaluation has submissions, so the
  // "No responses" completion filter yields the differentiated empty state.
  await page.getByRole("link", { name: "View Responses" }).first().click();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await page.getByLabel("Completion").selectOption("zero");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No Course evaluations match the selected filters.")).toBeVisible();

  // Reset, then Analytics Outcomes: central evidence exists but no central
  // deployment publishes a PLO snapshot, so the program-wide section shows
  // its differentiated empty state.
  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await page.getByLabel("Evidence source").selectOption("ALUMNI");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No program-wide PLO evidence")).toBeVisible();
});
