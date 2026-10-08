import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { E2E_CONTRACT } from "./support/contract";
import {
  loginAs,
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  waitForStableState,
} from "./support/helpers";

test("Dean inspects multi-program evidence, institutional evidence and empty scope", async ({
  page,
}, testInfo) => {
  await loginAs(page, E2E_CONTRACT.demoDean.email);
  await page.goto("/dean/analytics");
  await expect(page.getByRole("heading", { name: "Program evidence comparison" })).toBeVisible();
  for (const code of E2E_CONTRACT.deanAnalytics.programCodes)
    await expect(page.getByRole("link", { name: `Inspect ${code} evidence` })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Dean navigation" })
      .getByRole("link", { name: "Analytics", exact: true })
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(testInfo.outputDir, "dean-analytics-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Inspect BSIT evidence" }).click();
  await expect(page.getByRole("heading", { name: "BSIT Program Outcomes" })).toBeVisible();
  await expect(page.getByText("PO catalog and evidence availability")).toBeVisible();
  await waitForStableState(page);
  await page
    .getByRole("combobox", { name: "Academic period", exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/termInstanceId=/);
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(page).toHaveURL(/view=outcomes$/);
  await waitForStableState(page);
  await page
    .getByRole("combobox", { name: "Program", exact: true })
    .selectOption({ label: "BSIT · Bachelor of Science in Information Technology" });
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "BSIT Program Outcomes" })).toBeVisible();
  await page.getByRole("link", { name: "Courses and instruments", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Course and instrument evidence", exact: true })
  ).toBeVisible();
  const drill = page.getByRole("link", { name: /^Inspect / }).first();
  await expect(drill).toBeVisible();
  await drill.click();
  await expect(page.getByText("One evaluation selected.")).toBeVisible();
  await expect(page).toHaveURL(/evaluationId=/);
  for (const [link, heading] of [
    ["Stakeholders", "Stakeholder evidence"],
    ["Period history", "Program period history"],
    ["Written feedback", "Written feedback"],
  ]) {
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await page.getByRole("link", { name: "General Education / ILOs", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "General Education and institutional evidence" })
  ).toBeVisible();
  await expect(page.getByText(/ILOs are not classified as attainment/)).toBeVisible();
  await expect(
    page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "GEETHICS · Ethics" }) })
  ).toContainText("100.0%");
  await expectNoAxeViolations(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoAxeViolations(page);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(testInfo.outputDir, "dean-analytics-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 820, height: 1180 });
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await page.keyboard.press("Escape");
  await expectNoAxeViolations(page);
  await page.screenshot({
    path: join(testInfo.outputDir, "dean-analytics-tablet-dark.png"),
    fullPage: true,
  });
  await page.goto("/dean/analytics?view=outcomes");
  await expect(page.getByText(/No evaluations match this scope/)).toBeVisible();
  await page.goto("/dean/analytics?termInstanceId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await waitForStableState(page);
  await expect(
    page.getByRole("status").filter({ hasText: "This period no longer exists" })
  ).toBeVisible();
  await expect(page.getByText(/No evaluations match this scope/)).toBeVisible();
  await page.getByRole("button", { name: "Interpret current evidence" }).click();
  await expect(
    page.getByText(/AI is disabled or unconfigured|Interpretation unavailable/)
  ).toBeVisible();
});

test("Program Head cannot open Dean analytics directly", async ({ page }) => {
  await loginAs(page, E2E_CONTRACT.demoPh.email);
  await page.goto("/dean/analytics");
  await expect(page.getByRole("heading", { name: "Program evidence comparison" })).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/dean\/analytics/);
});
