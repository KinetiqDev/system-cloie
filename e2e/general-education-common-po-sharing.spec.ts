import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, expectNoHorizontalOverflow, loginAs } from "./support/helpers";

/**
 * ADR 0040 acceptance: two Faculty assigned to the same General Education
 * course under different programs read one shared, course-owned Common PO
 * mapping set. The journey is read-only — it never stages or commits a write,
 * so it stays idempotent against the disposable seeded database.
 */
for (const width of [1440, 393]) {
  test(`GE Common PO mappings are shared across assignment programs at ${width}px`, async ({
    page,
  }) => {
    const fx = fixture();
    const contract = fx.geCommonAlignment;

    // Faculty A: the demo Faculty's active GESTECH assignment under BSIT.
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, fx.demoFaculty.email);
    await page.goto(`/faculty/cilos/${contract.courseId}/alignment`);
    await expect(page.getByText("Shared General Education mapping")).toBeVisible();
    await expect(page.getByText(/Edits apply to every assignment of this course/)).toBeVisible();
    for (const code of contract.commonOutcomeCodes) {
      await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    // Faculty B: a different Faculty member assigned to the same course under BSBA.
    await loginAs(page, "faculty-bsba@cloie.test");
    await page.goto(`/faculty/cilos/${contract.courseId}/alignment`);
    await expect(page.getByText("Shared General Education mapping")).toBeVisible();
    for (const code of contract.commonOutcomeCodes) {
      await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
    }

    // One course-owned mapping set: both readers resolve identical saved values
    // (CILO 2 maps to COMMON-3 with the PRACTICE manifestation in the seed).
    await expect(
      page.getByRole("button", { name: /manifestation: Practice/ }).first()
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  });
}
