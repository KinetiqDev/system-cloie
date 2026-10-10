import { expect, test } from "@playwright/test";
import { E2E_CONTRACT } from "./support/contract";
import { expectNoAxeViolations, expectNoHorizontalOverflow } from "./support/helpers";
import { gotoStable } from "./support/visual";

for (const entrance of E2E_CONTRACT.publicEntrances) {
  test(`mobile ${entrance.audience} entrance keeps a focused sign-in journey`, async ({ page }) => {
    await gotoStable(page, entrance.landing);
    await expect(
      page.getByRole("heading", { level: 1, name: entrance.audience, exact: true })
    ).toBeVisible();
    const signIn = page.getByRole("link", { name: entrance.action, exact: true });
    await expect(page.locator('a[href^="/login/"]')).toHaveCount(1);
    const box = await signIn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    // The hero action group stacks below `sm`: a full-width primary with the
    // secondary centered under it, never a wrapped flex row stranded left.
    const actionRow = signIn.locator("..");
    const rowBox = (await actionRow.boundingBox())!;
    expect(box?.width).toBeCloseTo(rowBox.width, 0);
    if (entrance.registration) {
      const registration = page.getByRole("link", {
        name: entrance.registrationLabel!,
        exact: true,
      });
      const registrationBox = (await registration.boundingBox())!;
      expect(registrationBox.y).toBeGreaterThanOrEqual(box!.y + box!.height);
      expect(registrationBox.x + registrationBox.width / 2).toBeCloseTo(
        rowBox.x + rowBox.width / 2,
        0
      );
    }
    await expect(page.getByRole("banner")).toBeVisible();
    const guideLink = page.getByRole("link", { name: "User guide & docs" });
    await expect(guideLink).toHaveAttribute("href", /^https:\/\/help\.system-cloie\.app\//);
    await expect(guideLink).toHaveAttribute("target", "_blank");
    await expect(guideLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(
      page.getByRole("link", { name: /Choose another audience|All sign-in options/ })
    ).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await signIn.click();
    await expect(page).toHaveURL(entrance.login);
    await page.getByRole("link", { name: entrance.audience, exact: true }).click();
    await expect(page).toHaveURL(entrance.landing);
    if (entrance.registration) {
      await page.getByRole("link", { name: entrance.registrationLabel!, exact: true }).click();
      await expect(page).toHaveURL(entrance.registration);
      await expectNoHorizontalOverflow(page);
      await page.getByRole("link", { name: entrance.audience, exact: true }).click();
      await expect(page).toHaveURL(entrance.landing);
    } else {
      await expect(page.locator('a[href^="/register/"]')).toHaveCount(0);
    }
  });
}
