import { expect, test } from "@playwright/test";
import { fixture } from "./support/fixture";
import {
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  expectQuestionUnanswered,
  loginAs,
  rateQuestion,
} from "./support/helpers";

/**
 * §48/§61: mobile navigation (drawer) and filter persistence — filters are
 * URL state, so reloading must keep the applied scope.
 */
test("mobile drawer navigation and filter persistence", async ({ page }) => {
  const fx = fixture();

  await loginAs(page, fx.demoPh.email);
  await page.goto("/program-head");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Touch alternatives: primary controls are tappable button/link roles with
  // visible labels — nothing essential is hidden behind hover-only behavior.
  const navTrigger = page.getByRole("button", { name: "Open navigation menu" });
  await expect(navTrigger).toBeVisible();
  await expect(page.getByRole("main").getByRole("link").first()).toBeVisible();
  await expectNoAxeViolations(page);

  // Mobile drawer navigation to Responses.
  await navTrigger.click();
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(drawer).toBeVisible();
  await expectNoAxeViolations(page);
  await drawer.getByRole("link", { name: "Responses", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await expectNoAxeViolations(page);

  // Apply a filter; it must land in the URL and survive a reload.
  await page.getByLabel("Completion").selectOption("zero");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/completion=zero/);
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Responses" })).toBeVisible();
  await expect(page.getByLabel("Completion")).toHaveValue("zero");

  // Drawer navigation to Analytics; tab choice persists in the URL.
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const analyticsDrawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(analyticsDrawer).toBeVisible();
  await analyticsDrawer.getByRole("link", { name: "Analytics" }).click();
  await expect(analyticsDrawer).toBeHidden();
  // The analytics page runs several server reads (frame + tab content); on a
  // shared CI runner the first load can exceed the 15s default expect timeout
  // and leave the loading skeleton visible (observed flaky on main).
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("link", { name: "Trends", exact: true }).click();
  await expect(page).toHaveURL(/tab=trends/);
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByRole("link", { name: "Trends", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

/**
 * §33/§36/§61 (issue #545): the Faculty roster-management Drawer supports the
 * same mutation workflow on mobile, restores focus to its trigger after
 * closing, and prevents accidental dismissal while an unfinished preview is
 * pending. The already-active add is a safe no-op, so the journey performs no
 * database write and stays isolated from the desktop mutation journeys.
 */
test("faculty roster drawer: same workflow, focus restoration, and dismissal protection", async ({
  page,
}) => {
  const fx = fixture();

  await loginAs(page, fx.demoFaculty.email);
  await page.goto(`/course-rosters/${fx.gestechBsba.id}`);
  await expect(page.getByRole("heading", { name: "Course roster" })).toBeVisible();

  const manageButton = page.getByRole("button", { name: "Manage roster" });
  await manageButton.click();
  const drawer = page.getByRole("dialog", { name: "Manage roster" });
  await expect(drawer).toBeVisible();
  await expectNoAxeViolations(page);

  // Same workflow as desktop: scoped name search with a safe already-active
  // result (no write, no duplicate membership).
  await drawer.getByRole("tab", { name: "Add one Student" }).click();
  await drawer
    .getByRole("searchbox", { name: "Search scoped Students" })
    .fill(fx.rosterStudents.suggested.name);
  await drawer.getByRole("button", { name: new RegExp(fx.rosterStudents.suggested.name) }).click();
  await drawer.getByRole("button", { name: "Add Student" }).click();
  await expect(
    drawer.getByText("Student is already an active member of this Course roster.")
  ).toBeVisible();

  // Accidental-dismissal protection: an unfinished preview asks before closing.
  await drawer.getByRole("tab", { name: "Import from CSV" }).click();
  await drawer.locator("#course-roster-csv").setInputFiles({
    name: "roster.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`name\n${fx.rosterStudents.suggested.name} Jr.\n`, "utf8"),
  });
  await drawer.getByRole("button", { name: "Prepare preview" }).click();
  await expect(
    drawer.getByText("This confirmation will not add or restore any Students.")
  ).toBeVisible();

  await drawer.getByRole("button", { name: "Cancel" }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard preview?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(drawer).toBeVisible();

  await drawer.getByRole("button", { name: "Cancel" }).click();
  await discard.getByRole("button", { name: "Discard preview" }).click();
  await expect(drawer).toBeHidden();

  // Focus returns to the trigger that opened the workspace.
  await expect(manageButton).toBeFocused();
});

/**
 * §32/§61: the complete Student response lifecycle on a representative mobile
 * viewport (Pixel 7), running against the isolated BSIT AFTERNOON cohort of
 * the seeded GESTECH zero-response evaluation (demo-grad@cloie.test). The
 * desktop journey owns the BSIT MORNING cohort, so mutations stay isolated.
 *
 * Covers draft save + reload restoration, review, final submission, the
 * second-submission denial redirect, horizontal-overflow freedom on the
 * wizard and submitted states, and a keyboard-obstruction proxy: the focused
 * open-ended field must be able to scroll fully above the virtual-keyboard
 * zone (fully within the visible viewport).
 */
test("mobile student lifecycle: no overflow, keyboard-safe, draft survives reload", async ({
  page,
}) => {
  const fx = fixture();

  await loginAs(page, fx.mobileStudent.email);

  // Assigned evaluation is visible on the dashboard; open the instrument.
  await page.goto("/student/dashboard");
  const pendingCard = page
    .locator("div.group")
    .filter({ has: page.getByRole("heading", { name: fx.gestechEval.title }) })
    .first();
  await expect(pendingCard.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await pendingCard.getByRole("button", { name: "Start Evaluation" }).click();

  await expect(page.getByRole("heading", { name: fx.gestechEval.title, level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);

  // Answer section 1, navigate (auto-save), reload, and verify the draft
  // restored while the next section stayed untouched.
  for (const prompt of [
    "I achieved the first course intended learning outcome.",
    "I achieved the second course intended learning outcome.",
    "I achieved the third course intended learning outcome.",
  ]) {
    await rateQuestion(page, prompt, "Fully Achieved");
  }
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
  await expect(
    page
      .getByRole("group", { name: "I achieved the first course intended learning outcome." })
      .getByRole("radio", { name: /Fully Achieved/ })
  ).toBeChecked();

  await page.getByRole("button", { name: "Next Section" }).click();
  await expectQuestionUnanswered(
    page,
    "Overall, the course enabled me to achieve its intended learning outcomes"
  );

  // Complete the remaining sections.
  await rateQuestion(
    page,
    "Overall, the course enabled me to achieve its intended learning outcomes",
    "Mostly Achieved"
  );
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(
    page.getByRole("heading", { name: "Facilities and Learning Resources Evaluation" })
  ).toBeVisible();
  const facilities = [
    "The classrooms were conducive to learning",
    "Laboratory facilities (if applicable) supported the learning outcomes",
    "Equipment, tools, or software required for the course were adequate",
    "Library, online resources, or learning materials were sufficient",
    "Overall, the facilities supported effective delivery of the subject",
  ];
  for (const prompt of facilities) {
    await rateQuestion(page, prompt, "Mostly Achieved");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Qualitative Feedback" })).toBeVisible();
  const feedbackPrompt = "Which learning outcomes were fully achieved? Why?";
  await page
    .getByRole("textbox", { name: feedbackPrompt })
    .fill("The STS discussions made the societal impact of technology concrete.");

  // Keyboard obstruction proxy: the focused open-ended field must be able to
  // sit fully inside the visible viewport (above where the mobile keyboard
  // would render).
  const textarea = page.getByRole("textbox", { name: feedbackPrompt });
  await textarea.focus();
  await textarea.scrollIntoViewIfNeeded();
  const box = await textarea.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  // Review and submit.
  await page.getByRole("button", { name: "Review & Submit" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(reviewDialog).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await reviewDialog.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();

  // Fresh read: submitted state persists, still overflow-free. The mobile
  // layout renders history entries as cards (the table is desktop-only).
  await page.goto("/student/history");
  await expect(page.getByRole("heading", { name: "Submission History" })).toBeVisible();
  // Navigate from the evaluation heading up to the Card, then find the button.
  const submittedCard = page
    .getByRole("heading", { name: fx.gestechEval.title })
    .locator("..") // min-w-0 div
    .locator("..") // flex row div
    .locator("..") // CardContent
    .locator(".."); // Card
  await expect(submittedCard.getByText("Completed", { exact: true })).toBeVisible();
  // Use a full page load instead of the client-side Link click: the Next.js
  // prefetch RSC race can stall the streamed review page in production.
  const reviewHref = await submittedCard
    .getByRole("button", { name: "View Answers" })
    .getAttribute("href");
  await page.goto(reviewHref! + "?t=" + Date.now(), { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/student\/history\/[0-9a-f-]{36}(?:\?t=\d+)?$/);
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);

  // Second submission denied: the evaluation route redirects to the frozen
  // submitted review.
  await page.goto(`/student/evaluations/${fx.gestechMobileAssignment.id}`);
  await expect(page).toHaveURL(/\/student\/history\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next Section" })).toHaveCount(0);
});

/**
 * §46/§61: Alumni response lifecycle on mobile (issue #550) — same wizard,
 * horizontal-overflow freedom, and keyboard-safe interactions as the Student
 * mobile journey, but through the Alumni respondent flow (program-wide
 * deployment, distinct AGR5 prompts, and deployment-id-keyed history).
 *
 * Runs against the seeded BSIT Alumni (Mobile) zero-response deployment
 * (demo-alumni@cloie.test). The desktop journey publishes its own deployment;
 * the mobile journey owns this seeded one so mutations stay isolated across
 * projects (workers: 1, projects run sequentially but share the DB).
 */
test("mobile alumni lifecycle: no overflow, keyboard-safe, draft survives reload", async ({
  page,
}) => {
  await loginAs(page, "demo-alumni@cloie.test");

  await page.goto("/alumni/dashboard");
  await expect(page.getByText("Alumni Portal")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
  // The seeded mobile deployment must be visible on the dashboard.
  const pendingCard = page
    .locator("div.group")
    .filter({ has: page.getByRole("heading", { name: "BSIT Alumni Evaluation (Mobile)" }) })
    .first();
  await expect(pendingCard.getByRole("button", { name: "Start Evaluation" })).toBeVisible();
  await pendingCard.getByRole("button", { name: "Start Evaluation" }).click();

  await expect(
    page.getByRole("heading", { name: "BSIT Alumni Evaluation (Mobile)", level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Program Learning Experience", exact: true })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const prompt of [
    "The program provided a strong foundation in my field of study",
    "The courses were relevant to real-world applications",
    "The program developed my critical thinking and problem-solving skills",
  ]) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Graduate Outcomes Attainment" })).toBeVisible();

  await page.reload();
  // Resume reopens the wizard on the first incomplete section (section 2);
  // the persisted section 1 draft is verified by navigating back.
  await expect(
    page.getByRole("heading", { name: "BSIT Alumni Evaluation (Mobile)", level: 1 })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Graduate Outcomes Attainment" })).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByRole("heading", { name: "Program Learning Experience" })).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "The program provided a strong foundation in my field of study" })
      .getByRole("radio", { checked: true })
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Next Section" }).click();
  await expectQuestionUnanswered(
    page,
    "I can apply knowledge and skills acquired from the program in my work"
  );

  for (const prompt of [
    "I can apply knowledge and skills acquired from the program in my work",
    "I can communicate effectively in a professional environment",
    "I demonstrate ethical and professional behavior",
    "I can work effectively with teams and stakeholders",
    "I am capable of independent learning and self-improvement",
  ]) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Employment and Readiness" })).toBeVisible();
  for (const prompt of [
    "The program adequately prepared me for employment",
    "The skills I gained are aligned with industry expectations",
    "I was able to adapt quickly to workplace demands",
  ]) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Overall Assessment" })).toBeVisible();
  for (const prompt of [
    "Overall satisfaction with the program",
    "Overall readiness as a graduate",
  ]) {
    await rateQuestion(page, prompt, "Agree");
  }
  await page.getByRole("button", { name: "Next Section" }).click();
  await expect(page.getByRole("heading", { name: "Qualitative Feedback" })).toBeVisible();
  const qualitativePrompt = "Strengths of the program:";
  await page
    .getByRole("textbox", { name: qualitativePrompt })
    .fill("Excellent faculty and relevant curriculum.");
  await page.getByRole("textbox", { name: "Areas for improvement:" }).fill("More internships.");
  await page
    .getByRole("textbox", { name: "Suggestions to improve graduate readiness:" })
    .fill("Add certification prep.");

  const textarea = page.getByRole("textbox", { name: qualitativePrompt });
  await textarea.focus();
  await textarea.scrollIntoViewIfNeeded();
  const box = await textarea.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  await page.getByRole("button", { name: "Review & Submit" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review Your Answers" });
  await expect(reviewDialog).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await reviewDialog.getByRole("button", { name: "Confirm & Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluation Submitted!", level: 1 })
  ).toBeVisible();

  await page.goto("/alumni/history");
  await expect(page.getByRole("heading", { name: "Submission History" })).toBeVisible();
  const submittedCard = page
    .getByRole("heading", { name: "BSIT Alumni Evaluation (Mobile)" })
    .locator("..")
    .locator("..")
    .locator("..")
    .locator("..");
  await expect(submittedCard.getByText("Completed", { exact: true })).toBeVisible();
  const reviewHref = await submittedCard
    .getByRole("button", { name: "View Answers" })
    .getAttribute("href");
  await page.goto(reviewHref! + "?t=" + Date.now(), { waitUntil: "networkidle" });
  await expect(page.getByText(/Submitted on /)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
});
