import { expect, test } from "@playwright/test";
import { E2E_CONTRACT } from "./support/contract";
import { fixture } from "./support/fixture";
import { expectNoHorizontalOverflow, loginAs } from "./support/helpers";

test("secretary assigns both course scopes and receiving portals show the assignments", async ({
  page,
}) => {
  const data = fixture();
  const contract = E2E_CONTRACT.secretaryAssignments;
  await loginAs(page, E2E_CONTRACT.demoSecretary.email);
  await page.goto("/secretary/course-assignments");
  for (const courseCode of contract.courseCodes) {
    await page.getByRole("button", { name: "Assign Faculty", exact: true }).click();
    const course = page.getByRole("combobox", { name: "Search by code or title…" });
    await course.fill(courseCode);
    await page.getByRole("option", { name: new RegExp(`^${courseCode} —`) }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const program = page.getByRole("combobox", { name: "Program", exact: true });
    if (await program.isEnabled()) {
      await program.fill(contract.programCode);
      await page.getByRole("option", { name: new RegExp(`^${contract.programCode} `) }).click();
    }
    await page.getByRole("combobox", { name: /Year Level/ }).click();
    await page.getByRole("option", { name: contract.yearLevelLabel, exact: true }).click();
    await page.getByRole("combobox", { name: "Section", exact: true }).click();
    await page.getByRole("option", { name: contract.sectionLabel, exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Search faculty…" }).fill(contract.faculty.email);
    await page.getByRole("option", { name: new RegExp(contract.faculty.name) }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Assignment", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Assign Faculty to Course" })).toHaveCount(0);
  }
  await expectNoHorizontalOverflow(page);

  await loginAs(page, E2E_CONTRACT.demoPh.email);
  await page.goto(`/program-head/programs/${data.bsit.id}/dashboard`);
  const summary = page
    .locator("[data-slot=card]")
    .filter({ has: page.getByText("Course assignments", { exact: true }) });
  for (const code of contract.courseCodes)
    await expect(summary.getByText(new RegExp(`^${code} ·`))).toBeVisible();

  await loginAs(page, E2E_CONTRACT.demoGenEd.email);
  await page.goto("/gen-ed-coordinator/course-assignments?q=GEUS");
  await expect(page.getByText("GEUS", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(contract.faculty.name, { exact: true }).first()).toBeVisible();
  await page.goto("/gen-ed-coordinator/dashboard");
  await expect(
    page.getByRole("heading", { name: "General Education overview" }).first()
  ).toBeVisible();

  await loginAs(page, contract.faculty.email);
  await page.goto("/faculty/dashboard");
  for (const code of contract.courseCodes)
    await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
  await loginAs(page, E2E_CONTRACT.demoFaculty.email);
  await page.goto("/faculty/course-rosters?q=GEUS");
  await expect(page.getByText("GEUS", { exact: true })).toHaveCount(0);
});
