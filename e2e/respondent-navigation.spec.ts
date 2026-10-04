import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoHorizontalOverflow, loginAs } from "./support/helpers";

for (const width of [1440, 393]) {
  for (const role of ["student", "alumni", "industry-partner"] as const) {
    test(`${role} evaluation history restores the selected queue at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 851 });
      await loginAs(
        page,
        role === "student"
          ? fixture().demoStudent.email
          : role === "alumni"
            ? "demo-alumni@cloie.test"
            : "demo-industry@cloie.test"
      );
      await page.goto(`/${role}/evaluations?returnTo=%2Fdashboard&tab=pending#status`);

      const pending = page.getByRole("tab", { name: "Pending", exact: true });
      const inProgress = page.getByRole("tab", { name: "In Progress", exact: true });
      const submitted = page.getByRole("tab", { name: "Submitted", exact: true });
      await expect(pending).toHaveAttribute("aria-selected", "true");
      await inProgress.click();
      await expect(inProgress).toHaveAttribute("aria-selected", "true");
      await expect(page).toHaveURL(/tab=in-progress/);
      await submitted.click();
      await expect(submitted).toHaveAttribute("aria-selected", "true");
      await expect(page).toHaveURL(/tab=submitted/);

      await page.goBack();
      await expect(page).toHaveURL(/tab=in-progress/);
      await expect(inProgress).toHaveAttribute("aria-selected", "true");
      await expect(submitted).toHaveAttribute("aria-selected", "false");
      await expect(page.getByRole("tabpanel", { name: "In Progress", exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/dashboard");
      expect(new URL(page.url()).hash).toBe("#status");

      await page.goForward();
      await expect(page).toHaveURL(/tab=submitted/);
      await expect(submitted).toHaveAttribute("aria-selected", "true");
      await expect(inProgress).toHaveAttribute("aria-selected", "false");
      await expect(page.getByRole("tabpanel", { name: "Submitted", exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
}
