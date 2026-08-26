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
  const analyticsDrawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(analyticsDrawer).toBeVisible();
  await analyticsDrawer.getByRole("link", { name: "Analytics" }).click();
  await expect(analyticsDrawer).toBeHidden();
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

/**
 * §33/§36/§61 (issue #545): the Faculty roster-management Drawer supports the
 * same mutation workflow on mobile, restores focus to its trigger after
 * closing, and prevents accidental dismissal while an unfinished preview is
 * pending. The already-active add is a safe no-op, so the journey performs no
 * database write and stays isolated from the desktop mutation journeys.
 */
test("faculty roster drawer: same workflow, focus restoration, and dismissal protection", async ({
  page,
}) => {
  const fx = fixture();

  await loginAs(page, fx.demoFaculty.email);
  await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
  await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();

  const manageButton = page.getByRole("button", { name: "Manage roster" });
  await manageButton.click();
  const drawer = page.getByRole("dialog", { name: "Manage roster" });
  await expect(drawer).toBeVisible();

  // Same workflow as desktop: scoped name search with a safe already-active
  // result (no write, no duplicate membership).
  await drawer.getByRole("tab", { name: "Add one Student" }).click();
  await drawer
    .getByRole("searchbox", { name: "Search scoped Students" })
    .fill(fx.rosterStudents.suggested.name);
  await drawer.getByRole("button", { name: new RegExp(fx.rosterStudents.suggested.name) }).click();
  await drawer.getByRole("button", { name: "Add Student" }).click();
  await expect(
    drawer.getByText("Student is already an active member of this Course roster.")
  ).toBeVisible();

  // Accidental-dismissal protection: an unfinished preview asks before closing.
  await drawer.getByRole("tab", { name: "Import from CSV" }).click();
  await drawer.locator("#course-roster-csv").setInputFiles({
    name: "roster.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`name\n${fx.rosterStudents.suggested.name} Jr.\n`, "utf8"),
  });
  await drawer.getByRole("button", { name: "Prepare preview" }).click();
  await expect(
    drawer.getByText("This confirmation will not add or restore any Students.")
  ).toBeVisible();

  await drawer.getByRole("button", { name: "Cancel" }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard preview?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(drawer).toBeVisible();

  await drawer.getByRole("button", { name: "Cancel" }).click();
  await discard.getByRole("button", { name: "Discard preview" }).click();
  await expect(drawer).toBeHidden();

  // Focus returns to the trigger that opened the workspace.
  await expect(manageButton).toBeFocused();
});
