import { expect, type Page } from "@playwright/test";
import { E2E_CONTRACT } from "./contract";
import { fixture } from "./fixture";
import { expectNoAxeViolations, expectNoHorizontalOverflow, loginAs } from "./helpers";

export async function verifyAttainmentGuide(page: Page) {
  const fx = fixture();
  await loginAs(page, fx.demoPh.email);
  await page.goto(
    `/program-head/programs/${fx.bsit.id}/analytics?tab=outcomes&evidenceSource=COURSE`
  );
  const guide = page.getByRole("region", { name: "Attainment interpretation guide" }).first();
  await expect(guide).toBeVisible();
  for (const interpretation of E2E_CONTRACT.attainmentGuide.interpretations) {
    await expect(guide.getByText(interpretation, { exact: true })).toBeVisible();
  }
  await expect(guide).toContainText("Green: Meets Benchmark");
  await expect(guide).toContainText("Amber: Needs Attention");
  await expect(guide).toContainText("Red: Below Benchmark");
  await expect(guide).toContainText("Gray: No evidence");
  await expect(guide).toContainText("Proposed institutional policy");
  const chart = page.getByRole("region", { name: "Mean Rating by Program Outcome" });
  const bars = chart.locator(".recharts-bar-rectangle path");
  await expect(bars.first()).toBeVisible();
  const fills = await bars.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("fill"))
  );
  expect(
    fills.every((fill) =>
      E2E_CONTRACT.attainmentGuide.fills.includes(
        fill as (typeof E2E_CONTRACT.attainmentGuide.fills)[number]
      )
    )
  ).toBe(true);
  await expect(chart.getByText("Benchmark 3.50")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: /^Lacking Evidence/ }).click();
  await expect(
    page.getByRole("region", { name: "Attainment interpretation guide" }).first()
  ).toContainText("not non-attainment");
  await expect(page.locator(".recharts-bar-rectangle path")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
}
