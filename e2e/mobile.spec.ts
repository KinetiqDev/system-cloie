import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";

/**
 * §48/§61: mobile navigation (drawer) and filter persistence — filters are
 * URL state, so reloading must keep the applied scope.
 */
test("mobile drawer navigation and filter persistence", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Mobile drawer navigation to Responses.
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Responses", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();

  // Apply a filter; it must land in the URL and survive a reload.
  await page.getByLabel("Completion").selectOption("zero");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/completion=zero/);
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await expect(page.getByLabel("Completion")).toHaveValue("zero");

  // Drawer navigation to Analytics; tab choice persists in the URL.
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("dialog", { name: "Navigation menu" }).getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  await page.getByRole("link", { name: "Trends", exact: true }).click();
  await expect(page).toHaveURL(/tab=trends/);
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByRole("link", { name: "Trends", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
});
