import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { fixture } from "./support/fixture";
import { expectNoAxeViolations, loginAs, rateQuestion } from "./support/helpers";

/**
 * §40/§46/§47: Program-wide external respondent evidence (issue #550).
 *
 * Proves a Program-wide Alumni evaluation from authorized Program Head
 * publication through respondent submission and scoped evidence review, with
 * Industry Partner distinct assertions and denial paths for ineligible,
 * rejected, inactive, or out-of-scope accounts.
 */

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

function localDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test("program-wide alumni: publish, preview, submit, and scoped evidence review", async ({
  page,
}) => {
  const fx = fixture();
  const deploymentName = `BSIT Alumni Evaluation (E2E ${Date.now()})`;

  // ── 1. Program Head publishes a Program-wide Alumni deployment ──────────
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/tools/publish`);
  await expect(page.getByRole("heading", { name: "Publish Evaluation Tool" })).toBeVisible();

  await page.getByLabel("Deployed Evaluation Name").fill(deploymentName);
  await page.getByRole("combobox", { name: "Evaluation Template" }).click();
  await page.getByRole("option", { name: "Alumni Evaluation Tool" }).click();

  // Select the PLANNED academic term
  await page.getByRole("combobox", { name: "Academic Term" }).click();
  await page
    .getByRole("option", { name: /2027-2028/ })
    .first()
    .click();

  await page.getByRole("radio", { name: "Alumni", exact: true }).click();

  const now = new Date();
  const activation = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  await page.locator("#activation_at").fill(localDateTimeInputValue(activation));
  await page.locator("#deadline_at").fill(localDateTimeInputValue(deadline));

  // Preview respondents (no mutation)
  await page.getByRole("button", { name: "Preview Respondents" }).click();
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  await expect(page.getByText(/respondent\(s\) found/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Demo Alumni" })).toBeVisible();
  await expectNoAxeViolations(page);

  // Confirm and publish
  await page.getByRole("button", { name: "Confirm and Publish" }).click();
  await expect(page).toHaveURL(/tab=published/);
  await expect(page.getByText(/Deployment published successfully/)).toBeVisible();

  // Discover deployment ID via responses landing
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses?tab=program-wide`);
  const deploymentLink = page.getByRole("link", { name: deploymentName, exact: true });
  await expect(deploymentLink).toBeVisible();
  const href = await deploymentLink.getAttribute("href");
  const deploymentId = href!.split("/").pop()!;

  // ── 2. Alumni respondent: wizard, draft, review, submit, history ─────────
  await loginAs(page, "demo-alumni@cloie.test");
  await page.goto("/alumni/dashboard");
  await expect(page.getByText("Verification Pending")).toBeVisible();

  const card = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: deploymentName }) })
    .first();
  await expect(card.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await card.getByRole("button", { name: "Start Evaluation" }).click();

  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  for (const prompt of ALUMNI_SECTION_1_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();

  // Reload restores draft
  await page.reload();
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Next Section" }).click();

  for (const prompt of ALUMNI_SECTION_2_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();

  for (const prompt of ALUMNI_SECTION_3_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();

  for (const prompt of ALUMNI_SECTION_4_PROMPTS) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();

  for (const [prompt, answer] of Object.entries(ALUMNI_QUALITATIVE_PROMPTS)) {
    await page.getByRole("textbox", { name: prompt }).fill(answer);
  }

  await page.getByRole("button", { name: "Review & Submit" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(reviewDialog).toBeVisible();
  await expectNoAxeViolations(page);
  await reviewDialog.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();

  // History shows completed
  await page.goto("/alumni/history");
  await expect(page.getByText("Completed").first()).toBeVisible();

  // Second submission denied
  await page.goto(`/alumni/evaluations/${deploymentId}`);
  await expect(page).toHaveURL(/submitted/);
  await expect(page.getByRole("button", { name: "Next Section" })).toHaveCount(0);

  // ── 3. Program Head reviews scoped evidence ─────────────────────────────
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses/program-wide/${deploymentId}`);
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Demo Alumni" })).toBeVisible();

  // Cross-Program leakage: BEED Program Head gets Not Found
  await loginAs(page, fx.beedPh.email);
  await page.goto(`/program-head/programs/${fx.beed.id}/responses/program-wide/${deploymentId}`);
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();
});

test("ineligible, rejected, inactive, and out-of-scope external accounts cannot participate", async ({
  page,
}) => {
  const fx = fixture();
  const deploymentId = fx.centralEvaluation.id;

  // Out-of-scope: BSBA alumni accessing BSIT deployment -> Not Found
  await loginAs(page, "alumni-bsba@cloie.test");
  await page.goto(`/alumni/evaluations/${deploymentId}`);
  await expect(page.getByText("Not Found", { exact: false })).toBeVisible();

  // Rejected account -> /status/rejected
  await loginAs(page, "alumni-rejected@cloie.test");
  await page.goto("/alumni/dashboard");
  await expect(page).toHaveURL(/\/status\/rejected/);

  // Inactive account -> login rejected
  const response = await page.request.post("/api/auth/ci-test-login", {
    data: { email: "alumni-inactive@cloie.test" },
  });
  expect(response.status()).toBe(404);
});

test("industry partner: profile-based targeting and distinct instrument rules", async ({
  page,
}) => {
  const fx = fixture();
  const deploymentName = `BSIT Industry Eval (E2E ${Date.now()})`;

  // Program Head publishes Industry Partner deployment
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/tools/publish`);
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

  // Profile-based targeting: preview shows Demo Industry
  await page.getByRole("button", { name: "Preview Respondents" }).click();
  await expect(page.getByRole("heading", { name: "Respondent Preview" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Demo Industry", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and Publish" }).click();
  await expect(page).toHaveURL(/tab=published/);

  // Discover deployment
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses?tab=program-wide`);
  const link = page.getByRole("link", { name: deploymentName, exact: true });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const deploymentId = href!.split("/").pop()!;

  // Industry Partner respondent opens wizard with EV5 scale
  await loginAs(page, "demo-industry@cloie.test");
  await page.goto("/industry-partner/dashboard");
  const card = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: deploymentName }) })
    .first();
  await expect(card.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await card.getByRole("button", { name: "Start Evaluation" }).click();

  // Distinct EV5 scale
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await rateQuestion(page, "Applies theoretical knowledge to practical tasks", "Very Satisfactory");
  await rateQuestion(page, "Demonstrates understanding of industry practices", "Very Satisfactory");
  await rateQuestion(
    page,
    "Shows awareness of professional standards and procedures",
    "Very Satisfactory"
  );
  await page.getByRole("button", { name: "Next Section" }).click();

  for (const prompt of [
    "Performs assigned tasks effectively and accurately",
    "Demonstrates problem-solving and critical thinking",
    "Communicates clearly (oral and/or written)",
    "Uses tools, equipment, or technology appropriately",
  ]) {
    await rateQuestion(page, prompt, "Very Satisfactory");
  }
  await page.getByRole("button", { name: "Next Section" }).click();

  for (const prompt of [
    "Demonstrates professionalism and ethical behavior",
    "Shows initiative and willingness to learn",
    "Works well with supervisors and colleagues",
    "Demonstrates responsibility and reliability",
  ]) {
    await rateQuestion(page, prompt, "Very Satisfactory");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await rateQuestion(page, "Overall readiness for employment in the field", "Very Satisfactory");
  await page.getByRole("button", { name: "Next Section" }).click();

  // Qualitative section
  await page
    .getByRole("textbox", { name: "Strengths of our interns:" })
    .fill("Strong technical background.");
  await page
    .getByRole("textbox", { name: "Areas for improvement:" })
    .fill("More initiative on complex tasks.");
  await page
    .getByRole("textbox", { name: "Recommendations for curriculum or training enhancement:" })
    .fill("Add enterprise tooling labs.");
  await page.getByRole("button", { name: "Next Section" }).click();

  // Distinct recommendation section
  await page
    .getByRole("textbox", { name: "Would you recommend our graduates for employment?" })
    .fill("Yes");
  await page.getByRole("button", { name: "Review & Submit" }).click();

  const review = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();

  // Program Head sees evidence
  await loginAs(page, fx.demoPh.email);
  await page.goto(`/program-head/programs/${fx.bsit.id}/responses/program-wide/${deploymentId}`);
  await expect(page.getByRole("heading", { name: deploymentName, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Demo Industry" })).toBeVisible();
});
