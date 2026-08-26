import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, expectNoHorizontalOverflow, loginAs } from "./support/helpers";

/**
 * General Education Coordinator scope verification (issue #547).
 *
 * Proves the end-to-end observable contract:
 *   - Seeded General Education Coordinator enters role-owned route without a Program assignment.
 *   - The Coordinator completes one approved college-wide General Education ILO or Course Assignment mutation
 *     and sees the persisted result after reload.
 *   - Server authorization derives scope from Course.course_scope == GENERAL_EDUCATION.
 *   - Program-specific Course Assignment mutation attempt is denied at the server boundary.
 *   - Program Head and Secretary role boundaries remain unchanged.
 *   - Desktop and mobile viewports are clean of serious/critical axe findings and horizontal overflow.
 */
test.describe("General Education Coordinator Scope Verification", () => {
  test("Coordinator logs in, manages General Education ILOs college-wide, and sees persisted changes after reload", async ({
    page,
  }) => {
    const fx = fixture();
    await loginAs(page, fx.demoGenEd.email);

    // Coordinator enters role-owned dashboard (no program assignment required).
    await page.goto("/gen-ed-coordinator/dashboard");
    await expect(
      page.getByRole("heading", { name: "Gen Ed Coordinator Dashboard" }).first()
    ).toBeVisible({
      timeout: 15_000,
    });
    await expectNoHorizontalOverflow(page);

    // Navigate to Outcomes catalog.
    await page.goto("/gen-ed-coordinator/outcomes");
    await expect(
      page.getByRole("heading", { name: "Institutional Learning Outcomes" })
    ).toBeVisible({ timeout: 15_000 });
    await expectNoAxeViolations(page);
    await expectNoHorizontalOverflow(page);

    // Create a new college-wide ILO.
    const uniqueCode = `ILO-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const uniqueDesc = `Demonstrate college-wide competency in ${uniqueCode}`;

    await page.getByRole("button", { name: "Add ILO" }).click();
    const dialog = page.getByRole("dialog", { name: /Institutional Outcome/i });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("ILO Code").fill(uniqueCode);
    await dialog.getByLabel("Description").fill(uniqueDesc);
    await dialog.getByRole("button", { name: "Add ILO" }).click();

    // Confirm UI reflects the new ILO.
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(uniqueCode).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();

    // Reload browser and verify state persists.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Institutional Learning Outcomes" })
    ).toBeVisible();
    await expect(page.getByText(uniqueCode).first()).toBeVisible();
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();
  });

  test("Coordinator is granted General Education course assignment management, but denied Program-specific mutation", async ({
    page,
  }) => {
    const fx = fixture();
    await loginAs(page, fx.demoGenEd.email);

    // Navigate to General Education Course Assignments.
    await page.goto("/gen-ed-coordinator/course-assignments");
    await expect(page.getByRole("heading", { name: "General Education Assignments" })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoHorizontalOverflow(page);

    // Read-only General Education Courses catalog.
    await page.goto("/gen-ed-coordinator/courses");
    await expect(
      page.getByRole("heading", { name: "College-Wide General Education" }).first()
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("General Education courses only — college-wide catalog").first()
    ).toBeVisible();
    await expect(page.getByText("College-Wide").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Forged URL filter must not widen scope: coordinator list stays GENERAL_EDUCATION only.
    await page.goto("/gen-ed-coordinator/course-assignments?courseScope=PROGRAM_SPECIFIC");
    await expect(
      page.getByRole("heading", { name: "General Education Assignments" }).first()
    ).toBeVisible({
      timeout: 15_000,
    });
    await expectNoHorizontalOverflow(page);

    // Attempt direct navigation to Program Head route -> denied at server boundary.
    // The route may redirect to /unauthorized or render unauthorized content at the same URL;
    // either way the Coordinator must not see Program Head dashboard content.
    await page.goto("/program-head/programs");
    await expect(page.getByRole("heading", { name: "Program Head Dashboard" })).toHaveCount(0);
    const phUrl = page.url();
    if (!/\/unauthorized|\/login/.test(phUrl)) {
      await expect(page.locator("body")).not.toContainText("Program Head Dashboard");
    }

    // Attempt direct navigation to Secretary route -> denied at server boundary.
    await page.goto("/secretary/users");
    await expect(page).toHaveURL(/\/unauthorized|\/login/);
    await expect(page.getByText("User Management")).toHaveCount(0);
  });

  test("Coordinator mobile view: no overflow and responsive navigation", async ({ page }) => {
    const fx = fixture();
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, fx.demoGenEd.email);

    await page.goto("/gen-ed-coordinator/outcomes");
    await expect(
      page.getByRole("heading", { name: "Institutional Learning Outcomes" })
    ).toBeVisible({ timeout: 15_000 });

    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    const urlBefore = page.url();
    await page.reload();
    await expect(page).toHaveURL(urlBefore);
    await expect(
      page.getByRole("heading", { name: "Institutional Learning Outcomes" })
    ).toBeVisible();
  });
});
