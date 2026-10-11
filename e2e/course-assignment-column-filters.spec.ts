import { expect, test } from "@playwright/test";
import { E2E_CONTRACT } from "./support/contract";
import { loginAs } from "./support/helpers";

/**
 * Column filters must narrow the list without updating the Router mid-render.
 *
 * A facet choice used to navigate from inside a React state updater, which the
 * Router evaluates during render; React then warned "Cannot update a component
 * (`Router`) while rendering a different component" and the filter could apply
 * against stale state. Clearing every facet additionally pushed one navigation
 * per facet, because each cleared key ran its own navigate.
 *
 * The unit suite mocks the router as a plain spy, so it cannot observe a
 * render-phase commit — only a real router can — which makes this journey the
 * seam that pins both behaviours.
 */
test("column filters narrow the list with one navigation and no React error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const routeRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/secretary/course-assignments") &&
      request.resourceType() === "fetch"
    ) {
      routeRequests.push(request.url());
    }
  });

  await loginAs(page, E2E_CONTRACT.demoSecretary.email);
  await page.goto("/secretary/course-assignments");

  // Narrow by Course through its own column heading. Base UI renders each
  // choice as a visible control beside an aria-hidden twin, so the visible one
  // is the click target.
  await page.getByRole("button", { name: "Filter Course" }).click();
  const courseGroup = page.getByRole("radiogroup", { name: "Course" });
  await expect(courseGroup).toBeVisible();
  await courseGroup.locator('[role="radio"]:not([aria-hidden="true"])').nth(1).click();

  // The choice lands in the URL and reads back as a removable chip.
  await expect(page).toHaveURL(/courseId=/);
  const courseChip = page.getByRole("button", { name: /^Remove filter Course:/ });
  await expect(courseChip).toBeVisible();

  // Clearing every facet is one list read, not one per facet.
  await expect(page.getByRole("button", { name: "Clear all" })).toBeVisible();
  routeRequests.length = 0;
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(courseChip).toHaveCount(0);
  expect(routeRequests).toHaveLength(1);

  expect(errors.filter((message) => message.includes("Cannot update a component"))).toEqual([]);
});
