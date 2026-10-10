import { expect, test } from "@playwright/test";
import { E2E_CONTRACT } from "./support/contract";
import {
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  waitForAnimationsToSettle,
} from "./support/helpers";
import { gotoStable } from "./support/visual";

/**
 * The audience header carries the product name, the guide shortcut, and the
 * appearance control. `docs/design.md` requires a page header to hold one
 * visual row down to 320 px; a wrapped product name doubles the header and
 * spends the first screen the visitor needs for content.
 */
for (const entrance of E2E_CONTRACT.publicEntrances) {
  test(`mobile ${entrance.audience} header holds one row at 320 px`, async ({ page }) => {
    // 320 CSS px is the narrowest the header must hold. The Pixel 7 project's
    // `isMobile` stays on, so this exercises the mobile viewport path.
    await page.setViewportSize({ width: 320, height: 720 });
    await gotoStable(page, entrance.landing);

    const banner = page.getByRole("banner");
    const brand = banner.locator("p").filter({ hasText: "System CLOIE" }).first();
    await expect(brand).toBeVisible();
    // Fonts load with `display: "swap"`, so measure only after the real face
    // has replaced the fallback — the wrap this test guards depends on it.
    await brand.evaluate(() => document.fonts.ready.then(() => undefined));
    // One line box means the brand did not wrap; a wrapped brand reports two.
    expect(
      await brand.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      })
    ).toBe(1);

    const guideLink = page.getByRole("link", { name: "User guide & docs" });
    await waitForAnimationsToSettle(guideLink);
    const guideBox = (await guideLink.boundingBox())!;
    expect(guideBox.width).toBeGreaterThanOrEqual(44);
    expect(guideBox.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
  });
}

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
