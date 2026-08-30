import { expect, test } from "@playwright/test";

import { fixture } from "./support/fixture";
import { loginAs } from "./support/helpers";
import { gotoStable, screenshotStable, useReducedMotion } from "./support/visual";

/**
 * Mobile counterparts of the curated visual baseline (issue #551, @visual) on
 * the Pixel 7 project: application shell, navigation drawer overlay, and the
 * Responses landing. Deterministic by the same contract as the desktop
 * baseline (seeded fixtures, reduced motion, settled stable states).
 */
test.describe("@visual curated baseline (mobile)", () => {
  test("application shell: Program Head dashboard", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoPh.email);
    await gotoStable(page, "/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await screenshotStable(page, "mobile-dashboard.png");
  });

  test("mobile navigation: drawer overlay", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoPh.email);
    await gotoStable(page, "/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveScreenshot("mobile-navigation-drawer.png");
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("Responses landing", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoPh.email);
    await gotoStable(page, "/program-head");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page
      .getByRole("dialog", { name: "Navigation menu" })
      .getByRole("link", { name: "Responses", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
    await screenshotStable(page, "mobile-responses.png");
  });
});
