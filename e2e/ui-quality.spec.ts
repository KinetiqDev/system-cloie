import { expect, test } from "@playwright/test";

import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs, waitForStableState } from "./support/helpers";

/**
 * Explicit UI quality checks that depend on the publication-created Student
 * assignment (issue #551). This file sorts after `publication.spec.ts`, which
 * creates the assignment for the publication-roster Students.
 *
 * Keyboard completion: a Student completes wizard section 1 using only the
 * keyboard — radiogroup arrow keys plus the Next Section control — which
 * saves the section-scoped draft. The draft on this isolated identity
 * (student-bsed@cloie.test) is owned by this journey: re-runs resume on the
 * first incomplete section, re-enter section 1 by keyboard, and re-select the
 * same descriptor, so the persisted state stays idempotent.
 */
test("keyboard completion of a Student wizard section persists the draft", async ({ page }) => {
  const fx = fixture();
  const student = fx.publicationStudents[0]!;

  await loginAs(page, student.email);
  await page.goto("/student/dashboard");
  await waitForStableState(page);
  const card = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: fx.publicationDeploymentName }) })
    .filter({ has: page.getByRole("button", { name: /Start Evaluation|Resume/ }) })
    .last();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Start Evaluation|Resume/ }).click();
  await expect(
    page.getByRole("heading", { name: fx.publicationDeploymentName, level: 1 })
  ).toBeVisible();

  // A re-run resumes on the first incomplete section; section 1 is behind a
  // Previous step in that case. Only click when the control is enabled (section 2+).
  const previous = page.getByRole("button", { name: "Previous" });
  if ((await previous.count()) > 0 && (await previous.isVisible()) && (await previous.isEnabled())) {
    await previous.click();
  }
  await expect(
    page.getByRole("heading", { name: "Course Intended Learning Outcomes Evaluation" })
  ).toBeVisible();

  // Keyboard-only completion: focus the first radio of each Likert group and
  // move to the next descriptor with the arrow keys.
  const groups = page.getByRole("radiogroup");
  const groupCount = await groups.count();
  expect(groupCount).toBeGreaterThan(0);
  for (let i = 0; i < groupCount; i++) {
    const group = groups.nth(i);
    await group.getByRole("radio").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
  }

  // Keyboard navigation to the next section saves the section-scoped draft.
  let advanced = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const isNext = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.tagName === "BUTTON" && /Next Section/.test(active.textContent ?? "");
    });
    if (isNext) {
      await page.keyboard.press("Enter");
      advanced = true;
      break;
    }
  }
  expect(advanced, "Next Section must be keyboard-reachable").toBe(true);

  // A fresh read resumes past the completed section — the draft persisted.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: fx.publicationDeploymentName, level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Course Intended Learning Outcomes Evaluation" })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
  await expectNoAxeViolations(page);
});
