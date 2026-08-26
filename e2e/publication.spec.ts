import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs } from "./support/helpers";

/**
 * §34/§35/§36 (issue #546): Course-bound publication and roster locking end
 * to end, one workflow chain. A seeded Faculty Member opens an owned active
 * Course Assignment and publishes a Course-bound evaluation through a
 * Faculty-owned template bound to the assignment's course. The real service
 * rechecks the active period, ownership, template version, typed CILO
 * alignment, question bindings, roster eligibility, and the
 * one-evaluation-per-assignment rule; the browser proves the deployment
 * snapshots and one Evaluation Assignment per included Student were created.
 * The published roster becomes read-only (lock banner, no manage controls),
 * a duplicate publish attempt is rejected by the server, and a fresh Student
 * read shows the new evaluation with its instrument snapshot.
 *
 * The journey owns the GESTECH BSBA EVENING assignment (issue #546 fixture);
 * no other e2e journey mutates it, so the write stays isolated.
 */
const CILO_PROMPTS = [
  "I achieved the first course intended learning outcome.",
  "I achieved the second course intended learning outcome.",
  "I achieved the third course intended learning outcome.",
];

test("Faculty publishes an owned Course-bound evaluation; roster locks; Student receives it", async ({
  page,
}) => {
  const fx = fixture();

  // ── Faculty publishes through the real service ──────────────────────────
  await loginAs(page, fx.demoFaculty.email);

  // Faculty-owned template is publishable from Evaluation Tools.
  await page.goto("/faculty/tools");
  await expect(page.getByRole("heading", { name: "Evaluation Tools" })).toBeVisible();
  const templateCard = page
    .locator("div")
    .filter({ has: page.getByText(fx.publicationTemplate.name, { exact: true }) })
    .first();
  await expect(templateCard.getByRole("button", { name: "Publish" })).toBeVisible();
  await templateCard.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/faculty/cilo-evaluations/new\\?templateId=${fx.publicationTemplate.id}`)
  );

  // The publish page resolves the bound template's course context.
  await expect(page.getByRole("heading", { name: "Publish CILO Evaluation" })).toBeVisible();
  await expect(page.getByText(fx.publicationTemplate.name, { exact: true })).toBeVisible();

  // Configure: name the deployment and select the owned active assignment.
  await page.getByLabel("Deployed Evaluation Name").fill(fx.publicationDeploymentName);
  await page.getByLabel("Class Assignment").click();
  await page
    .getByRole("option", {
      name: new RegExp(`GESTECH.*EVENING \\(${fx.publicationTarget.programCode}\\)`),
    })
    .click();

  // Preview rechecks the roster: both seeded students are included.
  await page.getByRole("button", { name: "Preview Respondents" }).click();
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  await expect(
    page.getByText(
      `${fx.publicationStudents.length} of ${fx.publicationStudents.length} active roster member(s) will receive this evaluation.`
    )
  ).toBeVisible();
  for (const student of fx.publicationStudents) {
    await expect(page.getByText(student.name, { exact: true })).toBeVisible();
  }

  // Publish: the service creates the deployment snapshots and assignments.
  await page.getByRole("button", { name: "Publish Evaluation" }).click();
  await expect(page).toHaveURL(/\/faculty\/tools$/);
  await expect(
    page.getByText(
      `Evaluation published successfully! ${fx.publicationStudents.length} assignment(s) created.`
    )
  ).toBeVisible();

  // The Published tab lists the new evaluation.
  await page.getByRole("tab", { name: "Published" }).click();
  await expect(page.getByText(fx.publicationDeploymentName, { exact: true })).toBeVisible();

  // ── Fresh read: the published roster is review-only ─────────────────────
  await page.goto(`/course-rosters/${fx.publicationTarget.id}`);
  await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();
  await expect(page.getByText("Published evaluation lock", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("The roster is locked for review", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage roster" })).not.toBeVisible();

  // Stable roster state is axe-clean (no serious/critical WCAG A/AA).
  await expectNoAxeViolations(page);

  // ── Duplicate publication is rejected (one deployment per assignment) ───
  await page.goto(`/faculty/cilo-evaluations/new?templateId=${fx.publicationTemplate.id}`);
  await expect(page.getByRole("heading", { name: "Publish CILO Evaluation" })).toBeVisible();
  await page.getByLabel("Deployed Evaluation Name").fill(fx.publicationDeploymentName);
  await page.getByLabel("Class Assignment").click();
  await page
    .getByRole("option", {
      name: new RegExp(`GESTECH.*EVENING \\(${fx.publicationTarget.programCode}\\)`),
    })
    .click();
  await page.getByRole("button", { name: "Preview Respondents" }).click();
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  await page.getByRole("button", { name: "Publish Evaluation" }).click();
  await expect(
    page
      .getByText("This course assignment already has a deployed evaluation.", { exact: true })
      .first()
  ).toBeVisible();
  // The attempt must not navigate away from the publish form.
  await expect(page.getByRole("button", { name: "Publish Evaluation" })).toBeVisible();

  // ── A Student recipient receives the new evaluation (fresh read) ────────
  // The #544 lifecycle journey owns the demo-student and demo-graduate
  // identities, so the publication roster uses isolated Students (Juan Dela
  // Cruz); a fresh browser read as the recipient proves the newly published
  // evaluation and its instrument snapshot reach the Student.
  const recipient = fx.publicationStudents[0]!;
  await loginAs(page, recipient.email);

  await page.goto("/student/evaluations");
  await expect(page.getByRole("heading", { name: "My Evaluations" })).toBeVisible();

  const pendingCard = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: fx.publicationDeploymentName }) })
    .filter({ has: page.getByRole("button", { name: "Start Evaluation" }) })
    .last();
  await expect(pendingCard.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await pendingCard.getByRole("button", { name: "Start Evaluation" }).click();

  // The published instrument snapshot renders for the Student.
  await expect(
    page.getByRole("heading", { name: fx.publicationDeploymentName, level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Course Intended Learning Outcomes Evaluation" })
  ).toBeVisible();
  for (const prompt of CILO_PROMPTS) {
    await expect(page.getByRole("group", { name: prompt })).toBeVisible();
  }
});
