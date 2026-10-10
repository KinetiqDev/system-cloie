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
