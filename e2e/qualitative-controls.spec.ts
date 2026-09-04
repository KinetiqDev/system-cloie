import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./support/helpers";

async function expectQualitativeControlsToWork(page: Page) {
  const slider = page.getByRole("slider", { name: /Words shown in the cloud/ });
  await expect(slider).toBeVisible();
  await slider.scrollIntoViewIfNeeded();
  const ranked = page.getByRole("button", { name: "Ranked" });
  await expect(
    page.evaluate(() => {
      const sliderElement = document.querySelector<HTMLInputElement>('input[type="range"]');
      const rankedElement = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "Ranked"
      );
      if (!sliderElement || !rankedElement) return false;

      const isTopmost = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return (
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === element
        );
      };

      return isTopmost(sliderElement) && isTopmost(rankedElement);
    })
  ).resolves.toBe(true);

  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("10");
  await expect(
    page.getByRole("img", { name: /Word cloud of the most frequent terms/ })
  ).toBeVisible();

  await ranked.click();
  await expect(page.getByRole("table", { name: "Exact word frequency values" })).toBeVisible();

  await page.getByRole("button", { name: "Cloud" }).click();
  await expect(page.getByRole("slider", { name: /Words shown in the cloud: 10/ })).toBeVisible();
}

test.describe("Qualitative analytics controls", () => {
  test("Program Head dashboard and qualitative analytics controls update their views", async ({
    page,
  }) => {
    await loginAs(page, "ph-bshm@cloie.test");

    await page.goto("/program-head/dashboard");
    await expectQualitativeControlsToWork(page);

    await page.getByRole("link", { name: "Open qualitative analysis" }).click();
    await expect(page.getByRole("region", { name: "Qualitative evidence" })).toBeVisible();
    await expectQualitativeControlsToWork(page);
  });

  test("General Education Coordinator controls work at a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, "demo-gened@cloie.test");

    await page.goto("/gen-ed-coordinator/analytics");
    await expect(page.getByRole("region", { name: "Qualitative feedback" })).toBeVisible();
    await expectQualitativeControlsToWork(page);
  });
});
