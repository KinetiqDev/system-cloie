import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { fixture } from "./support/fixture";
import { expectNoHorizontalOverflow, loginAs, waitForStableState } from "./support/helpers";

/**
 * Overlay action containment: a dialog whose body content is taller than the
 * viewport must scroll inside the body and keep its actions reachable.
 *
 * Regression guard for the Course import dialog "Column guide": the desktop
 * dialog was a content-sized CSS grid, so the body never became the scroll
 * region and the footer was pushed past the bottom of the viewport with no way
 * to reach it. The dialog body is the only scroll region; the action stays
 * visible and operable in both the Dialog (desktop) and Drawer (mobile) shells.
 */

const IMPORT_CSV = [
  "course_code,course_title,course_scope,program_code,major_name,year_level,semester,term",
  "E2E OVERLAY 1,Overlay Probe Course,General Education,,,,,",
].join("\n");

async function expectDialogActionsReachable(page: Page) {
  const dialog = page.getByRole("dialog", { name: /Import Courses/ });
  await expect(dialog).toBeVisible();

  // The user-visible contract: the primary action is on screen and not pushed
  // past the bottom edge by the dialog's own content.
  const action = dialog.getByRole("button", { name: "Check file" });
  await expect(action).toBeInViewport();

  // The mechanism: an oversized body scrolls inside the overlay instead of
  // growing the overlay past the viewport.
  const body = dialog.locator('[data-slot="responsive-dialog-body"]');
  const overflow = await body.evaluate((node) => ({
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  }));
  expect(
    overflow.scrollHeight,
    "this journey needs a body taller than the viewport to be meaningful"
  ).toBeGreaterThan(overflow.clientHeight);

  return { dialog, body, action };
}

async function expectResponsivePlacement(page: Page, mobile: boolean) {
  const overlay = page.getByRole("dialog");
  await expect
    .poll(async () => {
      const box = await overlay.boundingBox();
      const viewport = page.viewportSize()!;
      if (!box) return false;
      return mobile
        ? Math.abs(box.y + box.height - viewport.height) <= 2
        : Math.abs(box.x + box.width / 2 - viewport.width / 2) <= 2 &&
            Math.abs(box.y + box.height / 2 - viewport.height / 2) <= 2;
    })
    .toBe(true);
}

test("Course import dialog keeps its action reachable when the column guide overflows", async ({
  page,
}) => {
  await loginAs(page, fixture().demoSecretary.email);

  // A short desktop window reproduces the reported case: the guide makes the
  // body taller than the dialog's viewport bound.
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/secretary/courses");
  await waitForStableState(page);

  await page.getByRole("button", { name: "Import CSV" }).click();
  const { body, action } = await expectDialogActionsReachable(page);
  await expectResponsivePlacement(page, false);

  // The action stays pinned while the body scrolls its own content.
  await body.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(action).toBeInViewport();

  // …and remains operable: the file is previewed, then Back returns to the file step.
  await page.setInputFiles("#course-import-file", {
    name: "course-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(IMPORT_CSV),
  });
  await action.click();
  await expect(page.getByText("Review Courses")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Create \d+ Courses?$/ })).toBeInViewport();
  await page.getByRole("dialog").getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Drop CSV here or choose a file")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("Course import drawer keeps its action reachable when the column guide overflows", async ({
  page,
}) => {
  await loginAs(page, fixture().demoSecretary.email);

  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/secretary/courses");
  await waitForStableState(page);

  await page.getByRole("button", { name: "Import CSV" }).click();
  const { body, action } = await expectDialogActionsReachable(page);
  await expectResponsivePlacement(page, true);

  await body.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(action).toBeInViewport();

  await expectNoHorizontalOverflow(page);
});

for (const viewport of [
  { width: 1280, height: 700 },
  { width: 390, height: 700 },
]) {
  test(`Course editor keeps focused fields inside its scroll body at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loginAs(page, fixture().demoSecretary.email);
    await page.goto("/secretary/courses");
    await waitForStableState(page);
    await page.getByRole("button", { name: "Add Course", exact: true }).click();
    await expectResponsivePlacement(page, viewport.width < 768);

    const dialog = page.getByRole("dialog", { name: "Add New Course" });
    const field = dialog.getByRole("textbox", { name: "Course Code", exact: true });
    await field.focus();
    await expect(field).toBeFocused();
    const containment = await field.evaluate((element) => {
      const body = element.closest('[data-slot="responsive-dialog-body"]')!;
      const fieldBox = element.getBoundingClientRect();
      const bodyBox = body.getBoundingClientRect();
      return {
        left: fieldBox.left - bodyBox.left,
        right: bodyBox.right - fieldBox.right,
        top: fieldBox.top - bodyBox.top,
      };
    });
    expect(containment.left).toBeGreaterThanOrEqual(3);
    expect(containment.right).toBeGreaterThanOrEqual(3);
    expect(containment.top).toBeGreaterThanOrEqual(3);
    await expect(
      dialog.getByRole("button", { name: "Create Course", exact: true })
    ).toBeInViewport();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
