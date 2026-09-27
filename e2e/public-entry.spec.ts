import { expect, test } from "@playwright/test";

import { expectNoAxeViolations, expectNoHorizontalOverflow } from "./support/helpers";
import { gotoStable } from "./support/visual";

/**
 * Public entry journeys (issue #649): the scoped entrances are reachable
 * signed-out, route to the right place, and retire the old portal flow.
 * No authenticated session is needed — every assertion below runs against
 * static public copy and routing, so these journeys pin the entry contract
 * without touching seeded fixtures.
 */
test.describe("public entry (signed-out)", () => {
  test("landing explains the purpose with three scoped entrances", async ({ page }) => {
    await gotoStable(page, "/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to System CLOIE" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Students/ })).toHaveAttribute(
      "href",
      "/login/student"
    );
    await expect(page.getByRole("link", { name: /Staff & Faculty/ })).toHaveAttribute(
      "href",
      "/login/staff"
    );
    await expect(page.getByRole("link", { name: /Alumni & Partners/ })).toHaveAttribute(
      "href",
      "/login/external"
    );
    await expect(page.getByRole("link", { name: /Submit a Faculty request/ })).toHaveAttribute(
      "href",
      "/register/faculty"
    );
    await expect(page.getByText("What System CLOIE is")).toBeVisible();
    await expect(page.getByText("What it is not")).toBeVisible();
    await expect(page.getByText("Help and frequently asked questions")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });

  test("student entrance offers a single ACD Google action", async ({ page }) => {
    await gotoStable(page, "/login/student");
    await expect(page.getByRole("heading", { level: 1, name: "Student sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with ACD Google/ })).toBeVisible();
    await expect(page.getByText(/no self-service placement form/i)).toBeVisible();
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

  test("external email-first Continue requires the legal acknowledgement", async ({ page }) => {
    await gotoStable(page, "/login/external");
    await page.getByLabel("Email address").fill("someone@example.com");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByText("Accept the Privacy Notice and Terms of Use to continue.")
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toBeHidden();
  });

  test("external email Continue advances to the password step", async ({ page }) => {
    await gotoStable(page, "/login/external");
    await page.getByLabel("Email address").fill("someone@example.com");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByLabel("Password")).toBeVisible();
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

  test("verify, forgot, and reset pages render their code and password flows", async ({ page }) => {
    await gotoStable(page, "/verify-email");
    await expect(page.getByRole("heading", { level: 1, name: "Verify your email" })).toBeVisible();
    await expect(page.getByLabel("6-digit verification code")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await expectNoAxeViolations(page);

    await gotoStable(page, "/forgot-password");
    await expect(
      page.getByRole("heading", { level: 1, name: "Forgot your password?" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send recovery code" })).toBeVisible();
    await expectNoAxeViolations(page);

    await gotoStable(page, "/reset-password");
    await expect(page.getByRole("heading", { level: 1, name: "Set a new password" })).toBeVisible();
    await expect(page.getByLabel("6-digit recovery code")).toBeVisible();
    // Exact: "New password" is a prefix of "Confirm new password", so a
    // substring locator resolves to both fields in strict mode.
    await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm new password", { exact: true })).toBeVisible();
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
