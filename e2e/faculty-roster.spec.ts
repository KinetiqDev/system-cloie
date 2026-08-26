import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs } from "./support/helpers";

/**
 * §33/§34/§36/§61 (issue #545): Faculty Course-assignment roster mutation end
 * to end. A seeded Faculty Member opens only an owned active Course Assignment
 * roster, adds an eligible existing Student through the scoped name search and
 * through the approved name-list reconciliation flow (no-write preview,
 * identity evidence, required acknowledgement, confirmation, result feedback),
 * and a fresh read shows the persisted membership with the correct eligibility
 * state. Out-of-scope, already-active, conflicting-section, and non-Student
 * accounts return safe user-facing results without leaking candidate data;
 * unknown names resolve to the same safe empty search result. Desktop surface
 * (the mobile Drawer path lives in `mobile.spec.ts`).
 */
test.describe("Faculty Course roster mutation", () => {
  test("opens only an owned active roster and adds an eligible Student via scoped search", async ({
    page,
  }) => {
    const fx = fixture();
    await loginAs(page, fx.demoFaculty.email);

    // Discovery lists the owned assignment for the active period.
    await page.goto("/faculty/course-rosters");
    await expect(page.getByRole("heading", { name: "My Course Rosters" })).toBeVisible();
    const ownedRow = page.getByRole("row", {
      name: new RegExp(`${fx.gestechBsba.courseCode}.*${fx.gestechBsba.programCode}`),
    });
    await expect(ownedRow.getByRole("link", { name: "Open roster" })).toBeVisible();
    await ownedRow.getByRole("link", { name: "Open roster" }).click();
    await expect(page).toHaveURL(new RegExp(`/course-rosters/${fx.gestechBsba.id}`));

    // The mutable roster detail is writable: ACTIVE state, no lock banner,
    // manage card present, seeded members listed.
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    await expect(page.getByText("GESTECH", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Open roster", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage roster" })).toBeVisible();
    const seededMember = page.getByRole("row", {
      name: new RegExp(fx.rosterStudents.alreadyActive.name),
    });
    await expect(seededMember).toBeVisible();

    // Add an eligible Student through the scoped name search.
    await page.getByRole("button", { name: "Manage roster" }).click();
    const dialog = page.getByRole("dialog", { name: "Manage roster" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("tab", { name: "Add one Student" }).click();
    const search = dialog.getByRole("searchbox", { name: "Search scoped Students" });
    await search.fill(fx.rosterStudents.addable.name);
    await dialog.getByRole("button", { name: new RegExp(fx.rosterStudents.addable.name) }).click();

    // Identity evidence: the selected Student's canonical name and email.
    await expect(dialog.getByText("Selected Student")).toBeVisible();
    await expect(
      dialog.getByText("Selected Student").locator("..").getByText(fx.rosterStudents.addable.email)
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Add Student" }).click();
    await expect(dialog.getByText("Student added to Course roster.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // The live table reflects the mutation immediately.
    const addedRow = page.getByRole("row", { name: new RegExp(fx.rosterStudents.addable.name) });
    await expect(addedRow).toBeVisible();
    await expect(addedRow.getByText("Evaluation-eligible")).toBeVisible();
  });

  test("reload shows the persisted membership with its eligibility state", async ({ page }) => {
    const fx = fixture();
    await loginAs(page, fx.demoFaculty.email);
    await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();

    const memberRow = page.getByRole("row", {
      name: new RegExp(fx.rosterStudents.addable.name),
    });
    await expect(memberRow).toBeVisible();
    await expect(memberRow.getByText(fx.rosterStudents.addable.email)).toBeVisible();
    await expect(memberRow.getByText("Evaluation-eligible")).toBeVisible();

    // Active-roster and evaluation-eligible counts include the added Student.
    await expect(
      page.getByText("Active roster").locator("..").getByText("3", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Currently evaluation-eligible").locator("..").getByText("3", { exact: true })
    ).toBeVisible();

    // Fresh read: the persisted membership and eligibility state survive reload.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    const reloadedRow = page.getByRole("row", {
      name: new RegExp(fx.rosterStudents.addable.name),
    });
    await expect(reloadedRow).toBeVisible();
    await expect(reloadedRow.getByText("Evaluation-eligible")).toBeVisible();
  });

  test("owned-but-locked and unowned rosters stay review-only or not-found", async ({ page }) => {
    const fx = fixture();
    await loginAs(page, fx.demoFaculty.email);

    // Owned but published-evaluation-locked roster: review-only banner, no
    // write controls.
    await page.goto(`/course-rosters/${fx.gestechBsit.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    await expect(
      page.getByText("Published evaluation lock", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("The roster is locked for review", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage roster" })).not.toBeVisible();

    // An assignment owned by another Faculty is indistinguishable from a
    // missing one (no data disclosure).
    await page.goto(`/course-rosters/${fx.mm201.id}`);
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
  });

  test("already-active, conflicting-section, and out-of-scope cases return safe results", async ({
    page,
  }) => {
    const fx = fixture();
    await loginAs(page, fx.demoFaculty.email);

    // Already-active member: explicit safe message, no duplicate row.
    await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    await page.getByRole("button", { name: "Manage roster" }).click();
    const dialog = page.getByRole("dialog", { name: "Manage roster" });
    await dialog.getByRole("tab", { name: "Add one Student" }).click();
    const search = dialog.getByRole("searchbox", { name: "Search scoped Students" });
    await search.fill(fx.rosterStudents.alreadyActive.name);
    await dialog
      .getByRole("button", { name: new RegExp(fx.rosterStudents.alreadyActive.name) })
      .click();
    await dialog.getByRole("button", { name: "Add Student" }).click();
    await expect(
      dialog.getByText("Student is already an active member of this Course roster.")
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Out-of-scope Student (BSBA profile vs BSIT assignment): the scoped
    // search must not disclose the candidate at all.
    await page.goto(`/course-rosters/${fx.itres1Afternoon.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    await page.getByRole("button", { name: "Manage roster" }).click();
    const itresDialog = page.getByRole("dialog", { name: "Manage roster" });
    await itresDialog.getByRole("tab", { name: "Add one Student" }).click();
    const itresSearch = itresDialog.getByRole("searchbox", { name: "Search scoped Students" });
    await itresSearch.fill(fx.rosterStudents.outOfScope.name);
    await expect(itresDialog.getByText("No scoped Students match this search.")).toBeVisible();
    await expect(itresDialog.getByText(fx.rosterStudents.outOfScope.email)).not.toBeVisible();

    // A non-Student account name is equally undisclosed.
    await itresSearch.fill("Demo Alumni");
    await expect(itresDialog.getByText("No scoped Students match this search.")).toBeVisible();

    // A genuinely unknown name resolves to the same safe empty result.
    await itresSearch.fill("Zzz No Such Student");
    await expect(itresDialog.getByText("No scoped Students match this search.")).toBeVisible();

    // Conflicting-section Student (active in ITRES1 MORNING): safe error.
    await itresSearch.fill(fx.rosterStudents.addable.name);
    await itresDialog
      .getByRole("button", { name: new RegExp(fx.rosterStudents.addable.name) })
      .click();
    await itresDialog.getByRole("button", { name: "Add Student" }).click();
    await expect(
      itresDialog.getByText(
        "Student is already active in another section for this Course and Academic Period."
      )
    ).toBeVisible();
  });

  test("CSV reconciliation: no-write preview, identity evidence, acknowledgement, confirmation, feedback", async ({
    page,
  }) => {
    const fx = fixture();
    await loginAs(page, fx.demoFaculty.email);
    await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();

    await page.getByRole("button", { name: "Manage roster" }).click();
    const dialog = page.getByRole("dialog", { name: "Manage roster" });
    await expect(dialog.getByRole("tab", { name: "Import from CSV" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    // One new eligible name entered as a suggested match ("Jr." suffix →
    // requires acknowledgement before confirmation), plus two exact
    // already-active names.
    const csv = [
      "name",
      `${fx.rosterStudents.csvAdd.name} Jr.`,
      fx.rosterStudents.alreadyActive.name,
      fx.rosterStudents.suggested.name,
    ].join("\n");
    await dialog.locator("#course-roster-csv").setInputFiles({
      name: "roster.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await dialog.getByRole("button", { name: "Prepare preview" }).click();

    // No-write preview: suggested rows are not effective until acknowledged,
    // so the stated effect is zero before the required acknowledgement.
    await expect(
      dialog.getByText("This confirmation will not add or restore any Students.")
    ).toBeVisible();
    // Identity evidence for the suggested-but-prepared row: canonical name
    // and email.
    await expect(dialog.getByText(fx.rosterStudents.csvAdd.name).first()).toBeVisible();
    await expect(dialog.getByText(fx.rosterStudents.csvAdd.email)).toBeVisible();

    // Required acknowledgement for the suggested match blocks confirmation.
    const notComplete = dialog.getByText("Review not complete");
    await expect(notComplete).toBeVisible();
    const acknowledge = dialog.getByRole("checkbox", {
      name: /I acknowledge 1 suggested match/,
    });
    await expect(acknowledge).toBeVisible();
    await acknowledge.check();
    await expect(notComplete).toBeHidden();
    await expect(
      dialog.getByText("This confirmation will add or restore 1 Student.")
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Review complete" }).click();

    // Result feedback groups the outcomes.
    await expect(dialog.getByText("Confirmation complete")).toBeVisible();
    await expect(dialog.getByText("Added to roster")).toBeVisible();
    await expect(dialog.getByText("Already active").first()).toBeVisible();
    // Close the results phase. "Cancel" is always available; the "Done"
    // primary button can transiently remain disabled under React 19
    // useTransition isPending edge cases (low-frequency flake; the mutation
    // already succeeded by this point, as verified below).
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Fresh read: the reconciled membership persisted with eligibility.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(fx.rosterStudents.csvAdd.name) });
    await expect(row).toBeVisible();
    await expect(row.getByText("Evaluation-eligible")).toBeVisible();
  });

  test("roster workspace states are free of serious/critical axe findings", async ({ page }) => {
    const fx = fixture();
    await loginAs(page, fx.demoFaculty.email);

    // Stable roster detail state.
    await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
    await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Roster management workspace (add phase).
    await page.getByRole("button", { name: "Manage roster" }).click();
    const dialog = page.getByRole("dialog", { name: "Manage roster" });
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(page);

    // Roster review phase with a suggested match and its acknowledgement.
    // "Patricia Luna Jr." resolves as a suggested READY_CREATE (the BEED
    // Student is eligible for the General Education roster and not a member),
    // keeping the workspace state stable without any write.
    await dialog.locator("#course-roster-csv").setInputFiles({
      name: "roster.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(`name\n${fx.rosterStudents.axeSuggested.name} Jr.\n`, "utf8"),
    });
    await dialog.getByRole("button", { name: "Prepare preview" }).click();
    await expect(
      dialog.getByRole("checkbox", { name: /I acknowledge 1 suggested match/ })
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
