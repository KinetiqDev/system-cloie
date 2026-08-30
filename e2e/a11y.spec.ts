import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs, waitForStableState } from "./support/helpers";

/**
 * §49 accessibility sweep on the evidence-workflow surfaces, run against the
 * seeded fixture: no serious/critical WCAG A/AA violations (axe-core).
 *
 * Issue #551 adds the explicit behavioral checks axe cannot prove: keyboard
 * operation and completion, dialog focus trap and restoration, tab order,
 * status and error announcements, reduced motion, and chart meaning. Every
 * sweep and check runs after the page reaches a stable state.
 */
test.describe("accessibility sweep", () => {
  test("dashboard, analytics, responses, evaluation and response detail are clean", async ({
    page,
  }) => {
    const fx = fixture();

    await loginAs(page, fx.demoPh.email);

    await page.goto("/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Analytics — Courses tab (charts + exact-values table).
    await page.getByRole("link", { name: "Open Analytics" }).first().click();
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Analytics views" })
      .getByRole("link", { name: "Courses", exact: true })
      .click();
    await expect(page.getByRole("region", { name: "Course breakdown" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Chart meaning: the chart is a named, described region and its exact
    // values remain available as a non-visual table alternative.
    const chart = page.getByRole("region", { name: "Mean Rating by Course" });
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute("aria-describedby", /.+/);
    await page.getByText("View exact values").first().click();
    await expect(
      page.getByRole("table", { name: "Exact values by comparison group" })
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: /IT201/ }).first()).toBeVisible();

    // Responses landing.
    await page.getByRole("link", { name: "Responses", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Course evaluation detail (identified respondents table).
    await page.getByRole("link", { name: fx.courseEvaluation.title, exact: true }).click();
    await expect(page.getByRole("heading", { name: fx.courseEvaluation.title })).toBeVisible();
    await expectNoAxeViolations(page);

    // Individual response detail (submitted answers).
    await page.getByRole("link", { name: fx.courseResponse.respondentName, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: fx.courseResponse.respondentName })
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("dashboard structure: one h1, main landmark, visible focus, nav-first tab order", async ({
    page,
  }) => {
    const fx = fixture();

    await loginAs(page, fx.demoPh.email);
    await page.goto("/program-head");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();

    // Interactive rows remain keyboard-reachable: focus moves to the first
    // stakeholder link and a visible focus style is applied.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    // Tab order: primary navigation is reached before main content.
    const regions: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      regions.push(
        await page.evaluate(
          () =>
            (document.activeElement as HTMLElement | null)?.closest("nav, header, main")?.tagName ??
            "none"
        )
      );
    }
    const navIndex = regions.findIndex((region) => region === "NAV");
    const mainIndex = regions.findIndex((region) => region === "MAIN");
    expect(
      navIndex,
      `expected navigation in tab sequence: ${regions.join(",")}`
    ).toBeGreaterThanOrEqual(0);
    if (mainIndex >= 0) {
      expect(navIndex, `navigation must precede main content: ${regions.join(",")}`).toBeLessThan(
        mainIndex
      );
    }
  });

  test("keyboard operation: role combobox opens by keyboard and validation errors announce", async ({
    page,
  }) => {
    const fx = fixture();

    await loginAs(page, fx.demoSecretary.email);
    await page.goto("/secretary/users/new");
    await expect(page.getByText("Add new user").first()).toBeVisible();

    // Keyboard-only traversal from the first field: Tab through Name/Email,
    // open the Role combobox, choose Faculty, and land on the submit control.
    await page.getByLabel("Name").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Email address")).toBeFocused();
    await page.keyboard.press("Tab");
    const roleCombobox = page.getByRole("combobox", { name: "Role" });
    await expect(roleCombobox).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    // Base UI Select typeahead: typing highlights the matching option.
    await page.keyboard.type("Faculty");
    await page.keyboard.press("Enter");
    await expect(roleCombobox).toContainText("Faculty");
    // The dynamic Program field appears for the Faculty role.
    await expect(page.getByRole("combobox", { name: /Affiliated program/i })).toBeVisible();

    // Move to the submit control by keyboard and submit the incomplete form.
    let submitted = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const isSubmit = await page.evaluate(() => {
        const active = document.activeElement as HTMLButtonElement | null;
        return active?.tagName === "BUTTON" && active.type === "submit";
      });
      if (isSubmit) {
        await page.keyboard.press("Enter");
        submitted = true;
        break;
      }
    }
    expect(submitted, "submit control must be keyboard-reachable").toBe(true);

    // Error announcement: invalid fields render role=alert messages.
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
    await expectNoAxeViolations(page);
  });

  test("dialog focus trap and focus restoration on the roster workspace", async ({ page }) => {
    const fx = fixture();

    await loginAs(page, fx.demoFaculty.email);
    await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();

    const trigger = page.getByRole("button", { name: "Manage roster" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Manage roster" });
    await expect(dialog).toBeVisible();
    await waitForStableState(page);
    // Focus trap: repeated Tab presses never leave the dialog.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const focusInside = await page.evaluate(() => {
        const open = document.querySelector('[role="dialog"]');
        return open?.contains(document.activeElement) ?? false;
      });
      expect(focusInside, `Tab ${i + 1} escaped the dialog`).toBe(true);
    }

    // Escape closes and restores focus to the trigger.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("reduced motion suppresses entrance animations", async ({ page }) => {
    const fx = fixture();

    await loginAs(page, fx.demoStudent.email);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/student/dashboard");
    const animated = page.locator('[class*="animate-in"]').first();
    await expect(animated).toBeVisible();
    await expect
      .poll(() => animated.evaluate((el) => getComputedStyle(el).animationName), {
        timeout: 10_000,
        message: "reduced motion must suppress entrance animations",
      })
      .toBe("none");

    // The check is meaningful: with motion allowed the same wrapper animates.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect
      .poll(() => animated.evaluate((el) => getComputedStyle(el).animationName), {
        timeout: 10_000,
      })
      .not.toBe("none");
  });

  test("public entry, filtered-empty, and not-found states are axe-clean", async ({ page }) => {
    const fx = fixture();

    // Public entry (signed-out context).
    await page.goto("/login");
    await expectNoAxeViolations(page);

    // Differentiated filtered-empty state.
    await loginAs(page, fx.demoPh.email);
    await page.goto("/program-head");
    await page.getByRole("link", { name: "Responses", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
    await page.getByPlaceholder(/Course, title, evaluation or faculty/).fill("zzzz-no-match");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByText("No Course evaluations match the selected filters.")).toBeVisible();
    await expectNoAxeViolations(page);

    // Cross-Program not-found state (no data leak).
    await loginAs(page, fx.beedPh.email);
    await page.goto(`/program-head/programs/${fx.bsit.id}/dashboard`);
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
