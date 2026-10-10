import { expect, test } from "@playwright/test";

import { expectNoAxeViolations, expectNoHorizontalOverflow } from "./support/helpers";
import { gotoStable } from "./support/visual";
import { E2E_CONTRACT } from "./support/contract";

/**
 * Public entry journeys (issue #649): the scoped entrances are reachable
 * signed-out, route to the right place, and retire the old portal flow.
 * No authenticated session is needed — every assertion below runs against
 * static public copy and routing, so these journeys pin the entry contract
 * without touching seeded fixtures.
 */
test.describe("public entry (signed-out)", () => {
  test("homepage explains the purpose and links audience landing pages", async ({ page }) => {
    await gotoStable(page, "/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to System CLOIE" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Students/ })).toHaveAttribute(
      "href",
      "/entry/student"
    );
    await expect(page.getByRole("link", { name: /Staff & Faculty/ })).toHaveAttribute(
      "href",
      "/entry/staff"
    );
    await expect(page.getByRole("link", { name: /Alumni & Partners/ })).toHaveAttribute(
      "href",
      "/entry/external"
    );
    await expect(page.getByRole("navigation", { name: "Choose your audience" })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Submit a Faculty request/ })).toHaveCount(0);
    await expect(page.getByText("What System CLOIE is")).toBeVisible();
    await expect(page.getByText("What it is not")).toBeVisible();
    await expect(page.getByText("Help and frequently asked questions")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  for (const entrance of E2E_CONTRACT.publicEntrances) {
    test(`${entrance.audience} landing keeps one primary sign-in and scoped navigation`, async ({
      page,
    }) => {
      await gotoStable(page, entrance.landing);
      await expect(
        page.getByRole("heading", { level: 1, name: entrance.audience, exact: true })
      ).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(`${entrance.audience} | System CLOIE`);
      const signIn = page.getByRole("link", { name: entrance.action, exact: true });
      await expect(page.locator('a[href^="/login/"]')).toHaveCount(1);
      await expect(signIn).toHaveAttribute("href", entrance.login);
      if (entrance.registration) {
        await expect(page.locator('a[href^="/register/"]')).toHaveCount(1);
        await expect(
          page.getByRole("link", { name: entrance.registrationLabel!, exact: true })
        ).toHaveAttribute("href", entrance.registration);
      } else {
        await expect(page.locator('a[href^="/register/"]')).toHaveCount(0);
      }
      await expectNoHorizontalOverflow(page);
      await expectNoAxeViolations(page);
      await signIn.focus();
      await expect(signIn).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(entrance.login);
      await page.getByRole("link", { name: entrance.audience, exact: true }).click();
      await expect(page).toHaveURL(entrance.landing);
      if (entrance.registration) {
        await page.getByRole("link", { name: entrance.registrationLabel!, exact: true }).click();
        await expect(page).toHaveURL(entrance.registration);
        await page.getByRole("link", { name: entrance.audience, exact: true }).click();
        await expect(page).toHaveURL(entrance.landing);
      }
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Before you sign in" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Choose another audience|All sign-in options/ })
      ).toHaveCount(0);
      const guideLink = page.getByRole("link", { name: "User guide & docs" });
      await expect(guideLink).toHaveAttribute("href", /^https:\/\/help\.system-cloie\.app\//);
      await expect(guideLink).toHaveAttribute("target", "_blank");
      await expect(guideLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  }

  test("student entrance offers a single ACD Google action", async ({ page }) => {
    await gotoStable(page, "/login/student");
    await expect(page.getByRole("heading", { level: 1, name: "Student sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with ACD Google/ })).toBeVisible();
    await expect(page.getByText(/office sets up your account/i)).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  test("staff entrance offers one Google action for all internal roles", async ({ page }) => {
    await gotoStable(page, "/login/staff");
    await expect(page.getByRole("heading", { level: 1, name: "Staff sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with ACD Google/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Submit a Faculty request/ })).toHaveAttribute(
      "href",
      "/register/faculty"
    );
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  test("faculty registration signs users in before any request form", async ({ page }) => {
    await gotoStable(page, "/register/faculty");
    await expect(
      page.getByRole("heading", { level: 1, name: "Faculty registration" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with ACD Google/ })).toBeVisible();
    await expect(page.getByText(/grants no Faculty access/i)).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  test("external entrance is email-first with a Google alternative", async ({ page }) => {
    await gotoStable(page, "/login/external");
    await expect(
      page.getByRole("heading", { level: 1, name: "Alumni & partner sign in" })
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  test("external email-first Continue waits for the legal acknowledgement", async ({ page }) => {
    await gotoStable(page, "/login/external");
    await page.getByLabel("Email address").fill("someone@example.com");
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await expect(page.locator("#external-password")).toBeHidden();

    await page.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  });

  test("external email Continue advances to the password step", async ({ page }) => {
    await gotoStable(page, "/login/external");
    await page.getByLabel("Email address").fill("someone@example.com");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#external-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot your password/ })).toBeVisible();
  });

  test("external registration collects a name and the Alumni/Industry choice", async ({ page }) => {
    await gotoStable(page, "/register/external");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create an external account" })
    ).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Alumni/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Industry Partner/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });
  test("external registration binds Google sign-in to the chosen role", async ({ page }) => {
    await gotoStable(page, "/register/external");
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await expect(page.getByText("Before you continue as Alumni")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("radio", { name: /Industry Partner/ }).check();
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await expect(page.getByText("Before you continue as Industry Partner")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  test("every entry password field can be revealed before submitting", async ({ page }) => {
    // The reveal control is named "Show password", so a label lookup for the
    // field would match both. aria-controls names the field it governs, which
    // locates the pair unambiguously and asserts the wiring at the same time.
    const reveal = (fieldId: string) => page.locator(`button[aria-controls="${fieldId}"]`);

    await gotoStable(page, "/register/external");
    const registerPassword = page.locator("#register-password");
    await expect(registerPassword).toHaveAttribute("type", "password");
    await reveal("register-password").click();
    await expect(registerPassword).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(registerPassword).toHaveAttribute("type", "password");
    await expectNoAxeViolations(page);

    await gotoStable(page, "/reset-password");
    const newPassword = page.locator("#reset-new-password");
    await expect(newPassword).toHaveAttribute("type", "password");
    await reveal("reset-new-password").click();
    await expect(newPassword).toHaveAttribute("type", "text");
    // The confirm field is independent: revealing one must not reveal the other.
    await expect(page.locator("#reset-confirm-password")).toHaveAttribute("type", "password");
    await expectNoAxeViolations(page);
  });

  test("registration waits for the acknowledgement before creating the account", async ({
    page,
  }) => {
    await gotoStable(page, "/register/external");
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
    await page.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
  });

  test("verify, forgot, and reset pages render their code and password flows", async ({ page }) => {
    await gotoStable(page, "/verify-email");
    await expect(page.getByRole("heading", { level: 1, name: "Verify your email" })).toBeVisible();
    await expect(page.getByLabel("6-digit verification code")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeEditable();
    // A cold visit holds no registration ticket, so the server gate is visible.
    await expect(page.getByRole("button", { name: "Verify email" })).toBeDisabled();
    await page.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "Verify email" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Resend code" })).toBeEnabled();
    await expectNoAxeViolations(page);

    await gotoStable(page, "/forgot-password");
    await expect(
      page.getByRole("heading", { level: 1, name: "Forgot your password?" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send recovery code" })).toBeDisabled();
    await page.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "Send recovery code" })).toBeEnabled();
    await expectNoAxeViolations(page);

    await gotoStable(page, "/reset-password");
    await expect(page.getByRole("heading", { level: 1, name: "Set a new password" })).toBeVisible();
    await expect(page.getByLabel("6-digit recovery code")).toBeVisible();
    await expect(page.locator("#reset-new-password")).toBeVisible();
    await expect(page.locator("#reset-confirm-password")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("status pages explain unprovisioned, pending, rejected, and method mismatch", async ({
    page,
  }) => {
    await gotoStable(page, "/status/unprovisioned-student");
    await expect(page.getByText("Student Account Not Set Up Yet")).toBeVisible();
    await expect(page.getByText(/Do not use Faculty registration/i)).toBeVisible();

    await gotoStable(page, "/status/faculty-pending");
    await expect(page.getByText("Faculty Request Pending Review")).toBeVisible();

    await gotoStable(page, "/status/faculty-rejected");
    await expect(page.getByText("Faculty Request Not Approved")).toBeVisible();

    await gotoStable(page, "/status/method-mismatch");
    await expect(page.getByText("Different Sign-In Method Required")).toBeVisible();
  });

  test("obsolete portal entry redirects to the scoped entrances", async ({ page }) => {
    await gotoStable(page, "/portal/staff");
    await expect(page).toHaveURL(/\/login\/staff/);

    await gotoStable(page, "/portal/respondents");
    await expect(page).toHaveURL(/\/$/);

    await gotoStable(page, "/portal");
    await expect(page).toHaveURL(/\/$/);

    await gotoStable(page, "/login");
    await expect(page).toHaveURL(/\/$/);
  });
});
