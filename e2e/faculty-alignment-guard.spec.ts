import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { fixture } from "./support/fixture";
import { expectNoHorizontalOverflow, loginAs, waitForStableState } from "./support/helpers";

/**
 * Faculty Course alignment: unsaved-mapping protection (issue reported from the
 * production surface — the browser drew its own confirmation prompt).
 *
 * The workspace holds staged mapping changes client-side until the author
 * reviews and saves them, so every way out of the page must ask before the
 * draft is lost, and the confirmation must be the product's own overlay rather
 * than a browser-native prompt. A native dialog is asserted against directly:
 * any dialog the page did not render fails the journey.
 *
 * The journey walks the real path a Faculty member walks — Manage CILOs → map a
 * Course → stage a change — and exits by both Back and the in-page back control.
 *
 * Regression this pins: the previous guard listened on `popstate`, which the
 * App Router also handles. On a Back traversal the router re-rendered the
 * previous route and React detached the guard before it could prompt, so the
 * draft was discarded with no confirmation at all.
 */

const DISCARD_CONFIRMATION = "Discard staged alignment changes?";

/** Records every browser-native dialog; asserts on the count afterwards. */
function collectNativeDialogs(page: Page): Array<{ type: string; message: string }> {
  const dialogs: Array<{ type: string; message: string }> = [];
  page.on("dialog", async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    // Dismissing models the user choosing to stay on every prompt kind.
    await dialog.dismiss().catch(() => undefined);
  });
  return dialogs;
}

async function enterDirtyAlignmentWorkspace(page: Page, courseCode: string) {
  await page.goto("/faculty/cilos");
  await waitForStableState(page);
  await page.getByRole("button", { name: new RegExp(`Map CILOs for ${courseCode}`) }).click();
  await expect(page.getByTestId("manifestation-matrix")).toBeVisible();

  // Stage one change so the draft is dirty.
  await page
    .getByTestId("manifestation-matrix")
    .getByRole("button", { name: /CILO 1, GO 1, manifestation: Learning/ })
    .click();
  await expect(page.getByRole("button", { name: /Review 1 change/ })).toBeEnabled();
}

/** The product's own confirmation, in whichever shell the viewport uses. */
function discardConfirmation(page: Page) {
  return page.locator('[role="alertdialog"], [role="dialog"]').filter({
    hasText: DISCARD_CONFIRMATION,
  });
}

/**
 * Presses the browser Back button. This drives the same traversal the Back
 * control does; `page.goBack()` is deliberately avoided because it tracks its
 * own history cursor, which a traversal the page cancels desynchronizes.
 */
async function pressBrowserBack(page: Page) {
  await page.evaluate(() => window.history.back());
}

test("staged alignment changes are protected by an in-app confirmation, not a native prompt", async ({
  page,
}) => {
  const fx = fixture();
  const native = collectNativeDialogs(page);

  await loginAs(page, fx.demoFaculty.email);
  await enterDirtyAlignmentWorkspace(page, "ITRES1");

  await expectNoHorizontalOverflow(page);

  // ── Back with a staged draft: the workspace holds and asks in-app ─────────
  await pressBrowserBack(page);
  await expect(discardConfirmation(page)).toBeVisible();
  expect(native, `native dialogs on Back: ${JSON.stringify(native)}`).toEqual([]);

  // Staying keeps the author, the staged change, and the matrix.
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(discardConfirmation(page)).toBeHidden();
  await expect(page.getByTestId("manifestation-matrix")).toBeVisible();
  await expect(page.getByRole("button", { name: /Review 1 change/ })).toBeEnabled();

  // ── Leaving through the confirmation still completes the departure ────────
  await pressBrowserBack(page);
  await expect(discardConfirmation(page)).toBeVisible();
  await page.getByRole("button", { name: "Discard and leave" }).click();
  await expect(page).toHaveURL(/\/faculty\/cilos$/, { timeout: 30_000 });
  expect(native).toEqual([]);
});

test("the in-page back control asks before discarding staged alignment changes", async ({
  page,
}) => {
  const fx = fixture();
  const native = collectNativeDialogs(page);

  await loginAs(page, fx.demoFaculty.email);
  await enterDirtyAlignmentWorkspace(page, "ITRES1");

  // BackLink renders a link-styled `<a>` carrying role="button".
  await page.getByRole("button", { name: /Back to Manage CILOs/ }).click();

  const confirmation = discardConfirmation(page);
  await expect(confirmation).toBeVisible();
  expect(native, `native dialogs on internal navigation: ${JSON.stringify(native)}`).toEqual([]);

  // Cancelling returns to editing without losing the draft or leaving the page.
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(confirmation).toBeHidden();
  await expect(page).toHaveURL(/\/alignment/);
  await expect(page.getByRole("button", { name: /Review 1 change/ })).toBeEnabled();

  await expectNoHorizontalOverflow(page);
});

test("the alignment guard holds Back without the Navigation API", async ({ page }) => {
  const fx = fixture();
  const native = collectNativeDialogs(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "navigation", { value: undefined, configurable: true });
  });
  await loginAs(page, fx.demoFaculty.email);
  await enterDirtyAlignmentWorkspace(page, "ITRES1");

  await pressBrowserBack(page);
  await expect(discardConfirmation(page)).toBeVisible();
  await expect(page.getByTestId("manifestation-matrix")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("button", { name: /Review 1 change/ })).toBeEnabled();

  await pressBrowserBack(page);
  await expect(discardConfirmation(page)).toBeVisible();
  await page.getByRole("button", { name: "Discard and leave" }).click();
  await expect(page).toHaveURL(/\/faculty\/cilos$/, { timeout: 30_000 });
  expect(native).toEqual([]);
});

test("discarding a staged draft leaves no extra Back entries without the Navigation API", async ({
  page,
}) => {
  const fx = fixture();
  await page.addInitScript(() => {
    Object.defineProperty(window, "navigation", { value: undefined, configurable: true });
  });
  await loginAs(page, fx.demoFaculty.email);
  await enterDirtyAlignmentWorkspace(page, "ITRES1");

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Discard changes" }).click();
    await page.getByRole("button", { name: "Discard draft" }).click();
    await expect(page.getByRole("button", { name: /Review 0 changes/ })).toBeDisabled();
    if (attempt === 0) {
      await page.getByRole("button", { name: /CILO 1, GO 1, manifestation: Learning/ }).click();
      await expect(page.getByRole("button", { name: /Review 1 change/ })).toBeEnabled();
    }
  }

  await pressBrowserBack(page);
  await expect(page).toHaveURL(/\/faculty\/cilos$/, { timeout: 30_000 });
});
