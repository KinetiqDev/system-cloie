import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import {
  expectNoAxeViolations,
  expectQuestionUnanswered,
  loginAs,
  rateQuestion,
} from "./support/helpers";

/**
 * §61 Student response lifecycle (issue #544), desktop:
 *
 *   assigned evaluation visible → published instrument opens → section-scoped
 *   draft save → reload restores the draft (other sections untouched) →
 *   review → final submission → fresh read shows SUBMITTED with frozen
 *   answers → editing/submitting again is denied by redirect to the frozen
 *   submitted review.
 *
 * Runs against the seeded GESTECH zero-response evaluation
 * (demo-student@cloie.test / BSIT cohort). The answers below are reviewed
 * literals owned by this journey — they are the independent source of truth
 * for the persisted-state assertions after submission.
 */
const SECTION_1_PROMPTS = [
  "I achieved the first course intended learning outcome.",
  "I achieved the second course intended learning outcome.",
  "I achieved the third course intended learning outcome.",
];

const SECTION_3_PROMPTS = [
  "The classrooms were conducive to learning",
  "Laboratory facilities (if applicable) supported the learning outcomes",
  "Equipment, tools, or software required for the course were adequate",
  "Library, online resources, or learning materials were sufficient",
  "Overall, the facilities supported effective delivery of the subject",
];

const SECTION_3_RATINGS = [
  "Mostly Achieved",
  "Mostly Achieved",
  "Moderately Achieved",
  "Mostly Achieved",
  "Mostly Achieved",
];

const QUALITATIVE_ANSWERS = {
  "Which learning outcomes were fully achieved? Why?":
    "The STS discussions on emerging technologies were very helpful for analyzing their societal impact.",
  "Which learning outcomes were least achieved? Why?":
    "More local case studies would strengthen the ethical implications discussions.",
  "What facilities or resources need improvement to better support learning?":
    "The classroom projector and online article access should be improved.",
};

test("student lifecycle: draft, reload, submit, and second-submission denial", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.demoStudent.email);

  // 1. The seeded eligible Student sees the assigned evaluation on the
  //    dashboard and opens the published instrument snapshot.
  await page.goto("/student/dashboard");
  const pendingCard = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: fx.gestechEval.title }) })
    .first();
  await expect(pendingCard.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await pendingCard.getByRole("button", { name: "Start Evaluation" }).click();

  // Wizard: the published instrument snapshot renders its sections.
  await expect(page.getByRole("heading", { name: fx.gestechEval.title, level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Course Intended Learning Outcomes Evaluation" })
  ).toBeVisible();
  for (const prompt of SECTION_1_PROMPTS) {
    await expect(page.getByRole("group", { name: prompt })).toBeVisible();
  }

  // Stable wizard state is axe-clean (no serious/critical WCAG A/AA).
  await expectNoAxeViolations(page);

  // 2. Answer the required quantitative items in section 1.
  for (const prompt of SECTION_1_PROMPTS) {
    await rateQuestion(page, prompt, "Fully Achieved");
  }

  // 3. Navigating saves a section-scoped draft; reload restores it.
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(
    page.getByRole("heading", { name: "Overall Course Outcome Attainment" })
  ).toBeVisible();

  await page.reload();
  // Resume reopens the wizard on the first incomplete section (section 2);
  // the persisted section 1 draft is verified by navigating back.
  await expect(
    page.getByRole("heading", { name: "Overall Course Outcome Attainment" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(
    page.getByRole("heading", { name: "Course Intended Learning Outcomes Evaluation" })
  ).toBeVisible();
  for (const prompt of SECTION_1_PROMPTS) {
    await expect(
      page.getByRole("group", { name: prompt }).getByRole("radio", { name: /Fully Achieved/ })
    ).toBeChecked();
  }

  // 4. The reload must not have touched other sections: section 2 is empty.
  await page.getByRole("button", { name: "Next Section" }).click();
  await expectQuestionUnanswered(
    page,
    "Overall, the course enabled me to achieve its intended learning outcomes"
  );

  // 5. Complete the remaining sections.
  await rateQuestion(
    page,
    "Overall, the course enabled me to achieve its intended learning outcomes",
    "Mostly Achieved"
  );
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(
    page.getByRole("heading", { name: "Facilities and Learning Resources Evaluation" })
  ).toBeVisible();
  for (let i = 0; i < SECTION_3_PROMPTS.length; i++) {
    await rateQuestion(page, SECTION_3_PROMPTS[i], SECTION_3_RATINGS[i]);
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Qualitative Feedback" })).toBeVisible();
  for (const [prompt, answer] of Object.entries(QUALITATIVE_ANSWERS)) {
    await page.getByRole("textbox", { name: prompt }).fill(answer);
  }

  // 6. Review and confirm final submission.
  await page.getByRole("button", { name: "Review & Submit" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(reviewDialog).toBeVisible();
  await expect(
    reviewDialog.getByText(
      QUALITATIVE_ANSWERS["Which learning outcomes were fully achieved? Why?"],
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    reviewDialog
      .getByText(SECTION_1_PROMPTS[0], { exact: true })
      .locator("..")
      .getByText("5", { exact: true })
  ).toBeVisible();
  await expect(
    reviewDialog.getByText("Responses are final after submission", { exact: true })
  ).toBeVisible();

  // Stable review overlay is axe-clean.
  await expectNoAxeViolations(page);

  await reviewDialog.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to Dashboard" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);

  // 7. A fresh read shows the response as SUBMITTED with persisted answers.
  await page.goto("/student/history");
  await expect(page.getByRole("heading", { name: "Submission History" })).toBeVisible();
  const historyRow = page
    .getByRole("row")
    .filter({ has: page.getByText(fx.gestechEval.title, { exact: true }) });
  await expect(historyRow.getByText("Completed", { exact: true })).toBeVisible();
  await historyRow.getByRole("button", { name: "View Answers" }).click();
  await expect(page).toHaveURL(/\/student\/history\/[0-9a-f-]{36}$/);

  await expect(page.getByRole("heading", { name: fx.gestechEval.title, level: 1 })).toBeVisible();
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  for (const prompt of SECTION_1_PROMPTS) {
    const block = page.getByText(prompt, { exact: true }).locator("..");
    await expect(block.getByText("5", { exact: true })).toBeVisible();
  }
  for (const [prompt, answer] of Object.entries(QUALITATIVE_ANSWERS)) {
    const block = page.getByText(prompt, { exact: true }).locator("..");
    await expect(block.getByText(answer, { exact: true })).toBeVisible();
  }

  // Stable submitted state is axe-clean — wait for the animate-in transition
  // (motion-safe:animate-in 500ms) to complete so axe sees final colors.
  await page.waitForTimeout(700);
  await expectNoAxeViolations(page);

  // 8. Editing or submitting again is denied: the evaluation route redirects
  //    to the frozen submitted review, which offers no edit controls.
  await page.goto(`/student/evaluations/${fx.gestechAssignment.id}`);
  await expect(page).toHaveURL(/\/student\/history\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: fx.gestechEval.title, level: 1 })).toBeVisible();
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next Section" })).toHaveCount(0);
});
