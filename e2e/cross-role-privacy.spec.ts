import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs } from "./support/helpers";

/**
 * §36/§37/§38/§40 (issue #548): Verify cross-role response privacy end to end.
 *
 * Proves the complete response-review privacy boundary:
 * 1. A submitted response appears in the authorized Faculty Member's review with an anonymized label (Respondent R-######).
 * 2. Faculty browser payload and DOM contain no respondent email, domain user ID, or identified name.
 * 3. Authorized Program Head reaches the identified response within the selected Authorized Program context.
 * 4. Unrelated Faculty Member, Program Head assigned to another Program, and guessed deep links receive safe denial (Not Found) without leaking data.
 * 5. Denial responses do not disclose the respondent, Course, evaluation, Program, or raw answer content.
 * 6. Aggregate analytics payloads remain de-identified, and axe checks pass.
 */
test.describe("Cross-role response privacy (§36, §37, §38, §40, #548)", () => {
  test("anonymized faculty review, identified program head access, denial, and analytics privacy", async ({
    page,
  }) => {
    const fx = fixture();

    // ── 1. Faculty Anonymized Review ──────────────────────────────────────
    await loginAs(page, fx.demoFaculty.email);

    await page.goto(`/faculty/cilo-evaluations/${fx.courseEvaluation.id}`);
    await expect(page.getByRole("heading", { name: fx.courseEvaluation.title })).toBeVisible();

    // Response cards are behind the "Responses" tab (CourseBoundReviewTabs defaults to "overview")
    await page.getByRole("tab", { name: "Responses" }).click();
    await expect(page.getByText(/^Respondent R-\d{6}$/).first()).toBeVisible();
    await expect(
      page.getByText(fx.courseResponse.respondentName, { exact: true })
    ).not.toBeVisible();
    await expect(page.getByText(fx.demoStudent.email, { exact: true })).not.toBeVisible();
    await expect(page.getByText(fx.demoStudent.id, { exact: true })).not.toBeVisible();

    await page.goto(
      `/faculty/cilo-evaluations/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
    );
    await expect(page.getByText(/^Respondent R-\d{6}$/)).toBeVisible();
    await expect(page.getByText("Section Responses (Read-only)")).toBeVisible();

    const facultyDetailContent = await page.content();
    expect(facultyDetailContent).not.toContain(fx.demoStudent.email);
    expect(facultyDetailContent).not.toContain(fx.demoStudent.id);
    expect(facultyDetailContent).not.toContain(fx.courseResponse.respondentName);
    expect(facultyDetailContent).not.toContain(fx.beedPh.email);
    expect(facultyDetailContent).not.toContain("ph-beed@cloie.test");

    const qualAnswerText = fx.courseResponse.qualitative[0].text;
    await expect(page.getByText(qualAnswerText, { exact: true })).toBeVisible();

    await expectNoAxeViolations(page);

    // ── 2. Authorized Program Head Identified Review ──────────────────────
    await loginAs(page, fx.demoPh.email);

    await page.goto(
      `/program-head/programs/${fx.bsit.id}/responses/course/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
    );
    await expect(
      page.getByRole("heading", { name: fx.courseResponse.respondentName })
    ).toBeVisible();
    // Respondent context label renders program and year/section (e.g., "BSIT · SECOND_YEAR · MORNING").
    // .first() avoids strict-mode violation when "BSIT" also appears in breadcrumbs/shell.
    await expect(page.getByText(/BSIT/).first()).toBeVisible();
    await expect(page.getByText(qualAnswerText, { exact: true })).toBeVisible();

    const phContent = await page.content();
    expect(phContent).toContain(fx.courseResponse.respondentName);
    await expectNoAxeViolations(page);

    // ── 3. Cross-Role and Cross-Program Denial ─────────────────────────────
    await loginAs(page, fx.beedPh.email);

    await page.goto(
      `/program-head/programs/${fx.beed.id}/responses/course/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
    );
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();

    const deniedBeedContent = await page.content();
    expect(deniedBeedContent).not.toContain(fx.courseResponse.respondentName);
    expect(deniedBeedContent).not.toContain(fx.demoStudent.email);
    expect(deniedBeedContent).not.toContain(qualAnswerText);
    expect(deniedBeedContent).not.toContain(fx.courseEvaluation.title);
    expect(deniedBeedContent).not.toContain("BSIT");
    await expectNoAxeViolations(page);

    await page.goto(
      `/program-head/programs/${fx.bsit.id}/responses/course/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
    );
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
    const deniedBeedBsitLeak = await page.content();
    expect(deniedBeedBsitLeak).not.toContain(fx.courseResponse.respondentName);
    expect(deniedBeedBsitLeak).not.toContain(fx.demoStudent.email);
    expect(deniedBeedBsitLeak).not.toContain(qualAnswerText);
    expect(deniedBeedBsitLeak).not.toContain(fx.courseEvaluation.title);

    await loginAs(page, "faculty-bsed@cloie.test");

    await page.goto(`/faculty/cilo-evaluations/${fx.courseEvaluation.id}`);
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto(
      `/faculty/cilo-evaluations/${fx.courseEvaluation.id}/responses/${fx.courseResponse.id}`
    );
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();

    const deniedFacultyContent = await page.content();
    expect(deniedFacultyContent).not.toContain(fx.courseResponse.respondentName);
    expect(deniedFacultyContent).not.toContain(fx.demoStudent.email);
    expect(deniedFacultyContent).not.toContain(qualAnswerText);
    expect(deniedFacultyContent).not.toContain(fx.courseEvaluation.title);

    await page.goto(
      `/faculty/cilo-evaluations/${fx.courseEvaluation.id}/responses/00000000-0000-0000-0000-000000000000`
    );
    await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
    const deniedGuessed = await page.content();
    expect(deniedGuessed).not.toContain(fx.courseResponse.respondentName);
    expect(deniedGuessed).not.toContain(fx.demoStudent.email);
    expect(deniedGuessed).not.toContain(qualAnswerText);
    // ── 4. De-identified Analytics Payload Verification ───────────────────
    await loginAs(page, fx.demoPh.email);
    await page.goto(`/program-head/programs/${fx.bsit.id}/analytics?tab=qualitative`);
    await expect(page.getByText("Qualitative Feedback").first()).toBeVisible();

    const analyticsContent = await page.content();
    expect(analyticsContent).not.toContain(fx.demoStudent.email);
    expect(analyticsContent).not.toContain(fx.demoStudent.id);
    expect(analyticsContent).not.toContain(qualAnswerText);
    await expectNoAxeViolations(page);
  });
});
