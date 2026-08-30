import { expect, test } from "@playwright/test";

import { fixture } from "./support/fixture";
import { loginAs, respondentRow, waitForStableState } from "./support/helpers";
import { gotoStable, screenshotStable, useReducedMotion } from "./support/visual";

/**
 * Curated Playwright screenshot baseline (issue #551, @visual).
 *
 * Representative surfaces only — public entry, application shell, Student
 * workflow, Faculty roster workspace, Secretary form, Program Head evidence
 * view, overlay, and empty/error states — not every route. The mobile
 * counterparts live in `mobile-visual-baseline.spec.ts` (mobile project).
 *
 * Determinism (issue #551): seeded fixture identities, fixed device
 * viewports, reduced motion, disabled animations and caret, network-settled
 * stable page states, and no masking (nothing volatile is visible).
 *
 * Ordering: this file sorts after `publication.spec.ts`, which creates the
 * publication-roster Student assignment used by the Student workflow shot
 * (student-bshm@cloie.test); the journey opens the wizard read-only, so it
 * neither submits nor saves a draft.
 */
test.describe("@visual curated baseline (desktop)", () => {
  test("public entry: login", async ({ page }) => {
    await useReducedMotion(page);
    await gotoStable(page, "/login");
    await screenshotStable(page, "public-login.png");
  });

  test("application shell: Program Head dashboard", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoPh.email);
    await gotoStable(page, "/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await screenshotStable(page, "shell-program-head-dashboard.png");
  });

  test("Student workflow: evaluation wizard first section", async ({ page }) => {
    const fx = fixture();
    const student = fx.publicationStudents[1]!;
    await useReducedMotion(page);
    await loginAs(page, student.email);
    await page.goto("/student/dashboard");
    const pendingCard = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: fx.publicationDeploymentName }) })
      .filter({ has: page.getByRole("button", { name: "Start Evaluation" }) })
      .last();
    await expect(pendingCard.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
    await pendingCard.getByRole("button", { name: "Start Evaluation" }).click();
    await expect(
      page.getByRole("heading", { name: fx.publicationDeploymentName, level: 1 })
    ).toBeVisible();
    await screenshotStable(page, "student-wizard-first-section.png");
  });

  test("Faculty roster workspace and Manage roster overlay", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoFaculty.email);
    await gotoStable(page, `/course-rosters/${fx.gestechBsba.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    await screenshotStable(page, "faculty-roster-workspace.png");

    // Overlay: the already-active suggestion is a deterministic no-op state.
    await page.getByRole("button", { name: "Manage roster" }).click();
    const dialog = page.getByRole("dialog", { name: "Manage roster" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("tab", { name: "Add one Student" }).click();
    await dialog
      .getByRole("searchbox", { name: "Search scoped Students" })
      .fill(fx.rosterStudents.suggested.name);
    await dialog
      .getByRole("button", { name: new RegExp(fx.rosterStudents.suggested.name) })
      .click();
    await dialog.getByRole("button", { name: "Add Student" }).click();
    await expect(
      dialog.getByText("Student is already an active member of this Course roster.")
    ).toBeVisible();
    await expect(dialog).toHaveScreenshot("faculty-roster-overlay.png");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("Secretary form: new user", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoSecretary.email);
    await gotoStable(page, "/secretary/users/new");
    await expect(page.getByText("Add new user").first()).toBeVisible();
    await screenshotStable(page, "secretary-new-user-form.png");
  });

  test("Program Head evidence view: identified response detail", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoPh.email);
    await page.goto("/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.getByRole("link", { name: "Responses", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
    await page.getByRole("link", { name: fx.courseEvaluation.title, exact: true }).click();
    await expect(page.getByRole("heading", { name: fx.courseEvaluation.title })).toBeVisible();
    await respondentRow(page, fx.courseResponse.respondentName)
      .getByRole("link", { name: "View Response" })
      .click();
    await expect(
      page.getByRole("heading", { name: fx.courseResponse.respondentName })
    ).toBeVisible();
    await screenshotStable(page, "program-head-evidence-response.png");
  });

  test("empty state: filtered Responses", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.demoPh.email);
    await gotoStable(page, "/program-head");
    await page.getByRole("link", { name: "Responses", exact: true }).click();
    await waitForStableState(page);
    await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
    await page.getByPlaceholder(/Course, title, evaluation or faculty/).fill("zzzz-no-match");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByText("No Course evaluations match the selected filters.")).toBeVisible();
    await screenshotStable(page, "empty-filtered-responses.png");
  });

  test("error state: cross-Program not-found", async ({ page }) => {
    const fx = fixture();
    await useReducedMotion(page);
    await loginAs(page, fx.beedPh.email);
    await gotoStable(page, `/program-head/programs/${fx.bsit.id}/dashboard`);
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
    await screenshotStable(page, "error-cross-program-not-found.png");
  });
});
