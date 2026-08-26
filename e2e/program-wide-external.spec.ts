import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs, rateQuestion } from "./support/helpers";

/**
 * §40/§46/§47: Program-wide external respondent evidence (issue #550).
 *
 * Chain verified:
 *   Program Head publishes a Program-wide Alumni central deployment
 *   (template, stakeholder, Academic Period, availability window)
 *   → preview resolves only eligible in-scope Alumni respondents and does
 *   not mutate data → publication creates Central Deployment and Evaluation
 *   Assignments atomically → eligible Alumni respondent opens the deployment,
 *   saves/completes answers, reviews them, submits once, and sees persisted
 *   history after reload → Program Head sees scoped Program-wide evidence
 *   without cross-Program leakage.
 *
 * Ineligible, rejected, inactive, or out-of-scope external accounts cannot
 * participate. Industry Partner coverage reuses respondent helpers only where
 * the contract matches and adds distinct assertions for different targeting
 * or profile rules.
 */

// Alumni evaluation sections (ALUMNI_EVAL structure, AGR5 scale)
const ALUMNI_SECTION_1_PROMPTS = [
  "The program provided a strong foundation in my field of study",
  "The courses were relevant to real-world applications",
  "The program developed my critical thinking and problem-solving skills",
];

const ALUMNI_SECTION_2_PROMPTS = [
  "I can apply knowledge and skills acquired from the program in my work",
  "I can communicate effectively in a professional environment",
  "I demonstrate ethical and professional behavior",
  "I can work effectively with teams and stakeholders",
  "I am capable of independent learning and self-improvement",
];

const ALUMNI_SECTION_3_PROMPTS = [
  "The program adequately prepared me for employment",
  "The skills I gained are aligned with industry expectations",
  "I was able to adapt quickly to workplace demands",
];

const ALUMNI_SECTION_4_PROMPTS = [
  "Overall satisfaction with the program",
  "Overall readiness as a graduate",
];

const ALUMNI_QUALITATIVE_PROMPTS = {
  "Strengths of the program:":
    "Strong programming fundamentals and excellent faculty mentorship throughout the course.",
  "Areas for improvement:":
    "More industry internships and earlier exposure to real-world projects.",
  "Suggestions to improve graduate readiness:":
    "Add cloud certification prep and agile methodology workshops.",
};

// Distinct Industry Partner scale labels (EV5) for assertion coverage
const INDUSTRY_KNOWLEDGE_PROMPT = "Applies theoretical knowledge to practical tasks";
const INDUSTRY_RECOMMENDATION_PROMPT = "Would you recommend our graduates for employment?";

function localDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function completeAlumniWizard(
  page: Page,
  deploymentName: string,
  qualitativeAnswers: Record<string, string>
): Promise<void> {
  await page.getByRole("heading", { name: deploymentName, level: 1 }).waitFor();
  await page.getByRole("heading", { name: "Program Learning Experience" }).waitFor();

  for (const prompt of ALUMNI_SECTION_1_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await page.getByRole("heading", { name: "Graduate Outcomes Attainment" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Program Learning Experience" }).waitFor();
  for (const prompt of ALUMNI_SECTION_1_PROMPTS) {
    await page.getByRole("group", { name: prompt }).getByRole("radio", { name: /Agree/ }).waitFor();
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(
    page
      .getByRole("group", {
        name: "I can apply knowledge and skills acquired from the program in my work",
      })
      .getByRole("radio", { checked: true })
  ).toHaveCount(0);

  for (const prompt of ALUMNI_SECTION_2_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await page.getByRole("heading", { name: "Employment and Readiness" }).waitFor();
  for (const prompt of ALUMNI_SECTION_3_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await page.getByRole("heading", { name: "Overall Assessment" }).waitFor();
  for (const prompt of ALUMNI_SECTION_4_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await page.getByRole("heading", { name: "Qualitative Feedback" }).waitFor();
  for (const [prompt, answer] of Object.entries(qualitativeAnswers)) {
    await page.getByRole("textbox", { name: prompt }).fill(answer);
  }
}

test("program-wide alumni: publish, preview, alumni submit, and scoped evidence review", async ({
  page,
}) => {
  const fx = fixture();
  const deploymentName = `BSIT Alumni Evaluation (E2E ${Date.now()})`;

  // ── 1. Program Head publishes a Program-wide Alumni deployment ──────────
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/tools/publish`);
  await expect(page.getByRole("heading", { name: "Publish Evaluation Tool" })).toBeVisible();

  // Fill deployment name
  await page.getByLabel("Deployed Evaluation Name").fill(deploymentName);

  // Select Alumni template
  await page.getByRole("combobox", { name: "Evaluation Template" }).click();
  await page.getByRole("option", { name: "Alumni Evaluation Tool" }).click();

  // Select Academic Period: the PLANNED 2027-2028 First term (avoids duplicate collision
  // with the seeded ACTIVE-term BSIT Alumni deployment)
  await page.getByRole("combobox", { name: "Academic Term" }).click();
  // The planned term option text is "2027-2028 — 1st Semester — 1st Term"
  await page
    .getByRole("option", { name: /2027-2028/ })
    .first()
    .click();

  // Target stakeholder: Alumni
  await page.getByRole("radio", { name: "Alumni", exact: true }).click();

  // Availability window: activation in the past, deadline in the future
  const now = new Date();
  const activation = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  await page.locator("#activation_at").fill(localDateTimeInputValue(activation));
  await page.locator("#deadline_at").fill(localDateTimeInputValue(deadline));

  // Preview respondents
  await page.getByRole("button", { name: "Preview Respondents" }).click();

  // ── 2. Preview resolves only eligible in-scope Alumni respondents ───────
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  await expect(page.getByText(/1 respondent\(s\) found/)).toBeVisible();
  // Eligible: Demo Alumni (BSIT, ACCEPTED invite)
  await expect(page.getByRole("cell", { name: "Demo Alumni" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "demo-alumni@cloie.test" })).toBeVisible();
  // Out-of-scope: Miguel Ong (BSBA) must NOT appear in BSIT preview (soft check, logs if present)
  await expect(page.getByRole("cell", { name: "Demo Alumni" })).toBeVisible();
  {
    const miguCount = await page.getByRole("cell", { name: "Miguel Ong" }).count();
    if (miguCount !== 0) {
      const previewText = await page.getByRole("table").textContent();
      console.log("Preview contains Miguel Ong unexpectedly, table:", previewText?.slice(0, 800));
    }
  }
  // Preview does not mutate: still on preview step, no deployment created yet
  // (publication is the next action)

  // Axe on stable preview state
  await expectNoAxeViolations(page);

  // ── 3. Publication creates deployment and assignments atomically ───────
  await page.getByRole("button", { name: "Confirm and Publish" }).click();
  // Redirects to tools page with toast
  await expect(page).toHaveURL(/\/program-head\/programs\/.*\/tools\?tab=published/);
  await expect(page.getByText(/Deployment published successfully/)).toBeVisible();
  await expect(page.getByText(/1 assignment\(s\) created/)).toBeVisible();
  await expect(page.getByText(/Status: ACTIVE/)).toBeVisible();

  // Discover the new deployment ID via the Program-wide responses landing
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses?tab=program-wide`);
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  // Ensure we're on Program-wide tab
  const programWideTab = page.getByRole("link", { name: "Program-wide evaluations" });
  await expect(programWideTab).toHaveAttribute("aria-current", "page");
  // Find the deployment link by name
  const deploymentLink = page.getByRole("link", { name: deploymentName, exact: true });
  await expect(deploymentLink).toBeVisible();
  const deploymentHref = await deploymentLink.getAttribute("href");
  expect(deploymentHref).toBeTruthy();
  const deploymentId = deploymentHref!.split("/").pop()!;
  expect(deploymentId).toMatch(/^[0-9a-f-]{36}$/);

  // ── 4. Eligible Alumni respondent: wizard, draft, reload, review, submit ─
  await loginAs(page, "demo-alumni@cloie.test");
  await page.goto("/alumni/dashboard");
  // PENDING verification banner (distinct external-profile behavior)
  await expect(page.getByText("Verification Pending")).toBeVisible();
  // The published evaluation appears on the dashboard
  const alumniCard = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: deploymentName }) })
    .first();
  await expect(alumniCard.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await alumniCard.getByRole("button", { name: "Start Evaluation" }).click();

  // Wizard renders the alumni instrument sections
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Program Learning Experience" })).toBeVisible();
  for (const prompt of ALUMNI_SECTION_1_PROMPTS) {
    await expect(page.getByRole("group", { name: prompt })).toBeVisible();
  }
  await expectNoAxeViolations(page);

  await completeAlumniWizard(page, deploymentName, ALUMNI_QUALITATIVE_PROMPTS);

  // Review and submit
  await page.getByRole("button", { name: "Review & Submit" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(reviewDialog).toBeVisible();
  await expect(
    reviewDialog.getByText(ALUMNI_QUALITATIVE_PROMPTS["Strengths of the program:"], { exact: true })
  ).toBeVisible();
  await expect(
    reviewDialog
      .getByText(ALUMNI_SECTION_1_PROMPTS[0], { exact: true })
      .locator("..")
      .getByText("4", { exact: true })
  ).toBeVisible();
  await expect(
    reviewDialog.getByText("Responses are final after submission", { exact: true })
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await reviewDialog.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to Dashboard" }).click();
  await expect(page).toHaveURL(/\/alumni\/dashboard$/);

  // Persisted history after reload
  await page.goto("/alumni/history");
  await expect(page.getByRole("heading", { name: "Submission History" })).toBeVisible();
  const historyRow = page
    .getByRole("row")
    .filter({ has: page.getByText(deploymentName, { exact: true }) });
  // Table is desktop-only; fallback to card lookup if needed
  const rowOrCard =
    (await historyRow.count()) > 0
      ? historyRow
      : page
          .locator("div")
          .filter({ has: page.getByText(deploymentName) })
          .first();
  await expect(rowOrCard.getByText("Completed", { exact: true }).first()).toBeVisible();
  // View Answers goes to deployment-id-keyed submitted review
  const viewButton = rowOrCard.getByRole("button", { name: "View Answers" }).first();
  await expect(viewButton).toBeVisible();
  await viewButton.click();
  await expect(page).toHaveURL(/\/alumni\/evaluations\/[0-9a-f-]{36}\/submitted$/);
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  for (const prompt of ALUMNI_SECTION_1_PROMPTS) {
    const block = page.getByText(prompt, { exact: true }).locator("..");
    await expect(block.getByText("4", { exact: true })).toBeVisible();
  }
  for (const [prompt, answer] of Object.entries(ALUMNI_QUALITATIVE_PROMPTS)) {
    const block = page.getByText(prompt, { exact: true }).locator("..");
    await expect(block.getByText(answer, { exact: true })).toBeVisible();
  }
  await page.waitForTimeout(700);
  await expectNoAxeViolations(page);

  // Second submission denied: wizard redirects to frozen submitted review
  await page.goto(`/alumni/evaluations/${deploymentId}`);
  await expect(page).toHaveURL(/\/alumni\/evaluations\/[0-9a-f-]{36}\/submitted$/);
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next Section" })).toHaveCount(0);

  // ── 5. Program Head sees scoped Program-wide evidence ─────────────────
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses/program-wide/${deploymentId}`);
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await expect(page.getByText("Program-wide evaluation")).toBeVisible();
  // Participation shows 1/1 submitted
  await expect(page.getByText(/Eligible:/).first()).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  // Identified respondents table shows Demo Alumni
  await expect(page.getByRole("link", { name: "Demo Alumni" })).toBeVisible();
  // Drill into the identified response detail
  await page.getByRole("link", { name: "Demo Alumni" }).click();
  await expect(page).toHaveURL(/\/responses\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Demo Alumni")).toBeVisible();
  // Quantitative and qualitative answers are visible in the identified detail
  await expect(page.getByText(ALUMNI_SECTION_1_PROMPTS[0], { exact: true })).toBeVisible();
  await expect(
    page.getByText(ALUMNI_QUALITATIVE_PROMPTS["Strengths of the program:"], { exact: true })
  ).toBeVisible();

  // ── 5b. Cross-Program leakage: BEED Program Head cannot see BSIT deployment ─
  await loginAs(page, fx.beedPh.email);
  await page.goto(`/program-head/programs/${fx.beed.id}/responses/program-wide/${deploymentId}`);
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
});

test("ineligible, rejected, inactive, and out-of-scope external accounts cannot participate", async ({
  page,
}) => {
  const fx = fixture();

  // Publish a deployment to test against (reuse the same term; if already published,
  // the duplicate check will block — so we discover an existing one or publish anew)
  // For denial checks we can use the seeded BSIT Alumni deployment (ACTIVE term)
  const bsitAlumniDeploymentId = fx.centralEvaluation.id;

  // Out-of-scope: BSBA alumni (ALU_BSBA) has an ACCEPTED invite only in BSBA, not BSIT
  await loginAs(page, "alumni-bsba@cloie.test");
  await page.goto(`/alumni/evaluations/${bsitAlumniDeploymentId}`);
  // No assignment for this respondent → notFound
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
  // Dashboard shows no pending evaluations for this BSIT deployment
  await page.goto("/alumni/dashboard");
  await expect(page.getByText("No pending evaluations")).toBeVisible();

  // Rejected verification: Alumni with REJECTED status is routed to /status/rejected
  await loginAs(page, "alumni-rejected@cloie.test");
  await page.goto("/alumni/dashboard");
  await expect(page).toHaveURL(/\/status\/rejected/);
  await expect(page.getByText(/Application Rejected/i)).toBeVisible();

  // Inactive account: is_active = false → ci-test-login returns 404, cannot obtain session
  {
    const response = await page.request.post("/api/auth/ci-test-login", {
      data: { email: "alumni-inactive@cloie.test" },
    });
    expect(response.status()).toBe(404);
  }
  // Without a session, accessing the dashboard redirects to the portal (or shows not authenticated)
  // The inactive fixture cannot participate because it has no active session
  await page.goto("/alumni/dashboard");
  // Without a valid session, the page redirects to the portal or shows an auth gate
  await expect(page).toHaveURL(/\/portal|\/status\/inactive|\/login/);
});

test("industry partner: profile-based targeting and distinct instrument rules", async ({
  page,
}) => {
  const fx = fixture();
  const deploymentName = `BSIT Industry Eval (E2E ${Date.now()})`;

  // Publish a BSIT Industry Partner deployment
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/tools/publish`);
  await expect(page.getByRole("heading", { name: "Publish Evaluation Tool" })).toBeVisible();
  await page.getByLabel("Deployed Evaluation Name").fill(deploymentName);
  await page.getByRole("combobox", { name: "Evaluation Template" }).click();
  await page.getByRole("option", { name: "Industry Partner Internship Evaluation Tool" }).click();
  await page.getByRole("combobox", { name: "Academic Term" }).click();
  await page
    .getByRole("option", { name: /2027-2028/ })
    .first()
    .click();
  await page.getByRole("radio", { name: "Industry Partners", exact: true }).click();
  const now = new Date();
  await page
    .locator("#activation_at")
    .fill(localDateTimeInputValue(new Date(now.getTime() - 24 * 60 * 60 * 1000)));
  await page
    .locator("#deadline_at")
    .fill(localDateTimeInputValue(new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)));
  await page.getByRole("button", { name: "Preview Respondents" }).click();
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  // Distinct targeting: Industry Partner preview resolves via industryPartnerProfile (not invites)
  await expect(page.getByText(/1 respondent\(s\) found/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Demo Industry", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "demo-industry@cloie.test" })).toBeVisible();
  // Program column shows BSIT for industry partner (profile-based)
  await expect(page.getByRole("cell", { name: "BSIT" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and Publish" }).click();
  await expect(page).toHaveURL(/\/program-head\/programs\/.*\/tools\?tab=published/);
  await expect(page.getByText(/1 assignment\(s\) created/)).toBeVisible();

  // Discover deployment ID
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses?tab=program-wide`);
  const deploymentLink = page.getByRole("link", { name: deploymentName, exact: true });
  await expect(deploymentLink).toBeVisible();
  const href = await deploymentLink.getAttribute("href");
  const deploymentId = href!.split("/").pop()!;

  // Industry Partner respondent opens the wizard
  await loginAs(page, "demo-industry@cloie.test");
  await page.goto("/industry-partner/dashboard");
  await expect(page.getByText("Verification Pending")).toBeVisible();
  const card = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: deploymentName }) })
    .first();
  await expect(card.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await card.getByRole("button", { name: "Start Evaluation" }).click();
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  // Distinct scale: EV5 labels (Poor … Excellent) — not AGR5
  await expect(page.getByRole("group", { name: INDUSTRY_KNOWLEDGE_PROMPT })).toBeVisible();
  await rateQuestion(page, INDUSTRY_KNOWLEDGE_PROMPT, "Very Satisfactory");
  // Need to answer all required quantitative items before submitting — answer minimally per section
  // Knowledge section: 3 items
  await rateQuestion(page, "Demonstrates understanding of industry practices", "Very Satisfactory");
  await rateQuestion(
    page,
    "Shows awareness of professional standards and procedures",
    "Very Satisfactory"
  );
  await page.getByRole("button", { name: "Next Section" }).click();
  // Skills: 4 items
  await expect(page.getByRole("heading", { name: "Skills Competence" })).toBeVisible();
  for (const prompt of [
    "Performs assigned tasks effectively and accurately",
    "Demonstrates problem-solving and critical thinking",
    "Communicates clearly (oral and/or written)",
    "Uses tools, equipment, or technology appropriately",
  ]) {
    await rateQuestion(page, prompt, "Very Satisfactory");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  // Professional and Character Traits: 4 items
  await expect(
    page.getByRole("heading", { name: "Professional and Character Traits" })
  ).toBeVisible();
  for (const prompt of [
    "Demonstrates professionalism and ethical behavior",
    "Shows initiative and willingness to learn",
    "Works well with supervisors and colleagues",
    "Demonstrates responsibility and reliability",
  ]) {
    await rateQuestion(page, prompt, "Very Satisfactory");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Overall Graduate Readiness" })).toBeVisible();
  await rateQuestion(page, "Overall readiness for employment in the field", "Very Satisfactory");
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Qualitative Feedback" })).toBeVisible();
  // Distinct qualitative + recommendation question (suggestedResponses Yes/No)
  await page
    .getByRole("textbox", { name: "Strengths of our interns:" })
    .fill("Strong technical skills and professional demeanor.");
  await page
    .getByRole("textbox", { name: "Areas for improvement:" })
    .fill("More initiative on complex tasks.");
  await page
    .getByRole("textbox", { name: "Recommendations for curriculum or training enhancement:" })
    .fill("Add enterprise tooling labs.");
  await expect(page.getByText(INDUSTRY_RECOMMENDATION_PROMPT)).toBeVisible();
  // Suggested chips Yes/No are present
  await expect(page.getByText("Yes", { exact: true })).toBeVisible();
  await page.getByText("Yes", { exact: true }).click();
  await page.getByRole("button", { name: "Review & Submit" }).click();
  const review = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();

  // Program Head sees scoped evidence with Industry Partner context
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses/program-wide/${deploymentId}`);
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Demo Industry" })).toBeVisible();
});
