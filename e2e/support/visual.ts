import { expect, type Locator, type Page } from "@playwright/test";

import { waitForStableState } from "./helpers";

/**
 * Deterministic helpers for the curated visual baseline (issue #551).
 *
 * Baselines assume the seeded fixture database, the fixed device viewports of
 * the configured projects, reduced motion, and a network-settled stable page
 * state. Masking stays minimal — only genuinely volatile content is masked.
 */

/** Force reduced motion before navigation (§22: no chart/entrance motion). */
export async function useReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

/** Navigate and settle on the stable page state before capturing. */
export async function gotoStable(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForStableState(page);
}

/** Viewport screenshot with an explicit, curated name. */
export async function screenshotStable(
  page: Page,
  name: string,
  options?: { mask?: Locator[] }
): Promise<void> {
  await waitForStableState(page);
  await expect(page).toHaveScreenshot(name, options?.mask ? { mask: options.mask } : undefined);
}

/** Element screenshot (used for overlays so the backdrop stays out of scope). */
export async function screenshotElementStable(locator: Locator, name: string): Promise<void> {
  await expect(locator).toHaveScreenshot(name);
}
