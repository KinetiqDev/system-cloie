import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { fixture } from "./support/fixture";
import { loginAs, expectNoHorizontalOverflow } from "./support/helpers";

// ---------------------------------------------------------------------------
// Program Head report exports (ADR 0044)
//
// The journeys download each export through the browser and inspect the file
// that lands on disk: worksheet structure, printed headers, and respondent
// names. They also pin the confidentiality boundary: a Faculty account cannot
// download named responses, and a Program Head cannot export another Program.
// ---------------------------------------------------------------------------

const EXPORT_TIMEOUT = 60_000;

async function downloadReport(page: import("@playwright/test").Page, buttonName: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: EXPORT_TIMEOUT }),
    page.getByRole("button", { name: buttonName }).click(),
  ]);
  const path = await download.path();
  return { filename: download.suggestedFilename(), path: path! };
}

test.describe("Program Head report exports", () => {
  test("exports a course workbook, a Program Outcome report, and a raw CSV", async ({ page }) => {
    const { bsit, courseResponse } = fixture();
    await loginAs(page, "demo-ph@cloie.test");
    await page.goto(`/program-head/programs/${bsit.id}/reports`);

    // Named-response exports are restricted access and say so before download.
    await expect(page.getByText("Confidential: these reports name respondents")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export course workbook" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export Program Outcome report" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export raw quantitative CSV" })).toBeVisible();

    const workbook = await downloadReport(page, "Export course workbook");
    expect(workbook.filename).toMatch(/^bsit-course-workbook-.*\.xlsx$/);
    const parsed = new ExcelJS.Workbook();
    await parsed.xlsx.readFile(workbook.path);
    const sheetNames = parsed.worksheets.map((sheet) => sheet.name);
    expect(sheetNames.slice(0, 2)).toEqual(["Overview", "PO Summary"]);
    expect(sheetNames).toContain("Data Dictionary");
    // One worksheet per in-scope Professional Course, named by course code.
    expect(sheetNames.some((name) => /^[A-Z]{2,}[0-9A-Z]+$/.test(name))).toBe(true);
    const workbookText = parsed.worksheets
      .map(
        (sheet) => sheet.getRow(1).getCell(1).value // System CLOIE title block
      )
      .join(" ");
    expect(workbookText).toContain("System CLOIE");

    const report = await downloadReport(page, "Export Program Outcome report");
    expect(report.filename).toMatch(/^bsit-program-outcome-report-.*\.xlsx$/);
    const parsedReport = new ExcelJS.Workbook();
    await parsedReport.xlsx.readFile(report.path);
    expect(parsedReport.worksheets.map((sheet) => sheet.name)).toEqual([
      "Overview",
      "PO Summary",
      "PO Classification",
      "PO Rating Tallies",
      "Course and CILO Contributions",
      "Program-wide Evidence",
      "Data Dictionary",
    ]);

    const csv = await downloadReport(page, "Export raw quantitative CSV");
    expect(csv.filename).toMatch(/^bsit-raw-quantitative-data-.*\.csv$/);
    const csvText = await readFile(csv.path!, "utf8");
    const [header] = csvText.trimEnd().split("\r\n");
    expect(header).toContain("period_school_year");
    expect(header).toContain("po_classifications");
    expect(header).toContain("respondent_name");
    expect(header).toContain("rating_value");
    // The seeded respondent appears by name; no account address is exported.
    expect(csvText).toContain(courseResponse.respondentName);
    expect(csvText).not.toContain("@");
    await expect(page.getByText(/Downloaded /)).toBeVisible();
  });

  test("keeps the export controls usable on a phone viewport", async ({ page }) => {
    const { bsit } = fixture();
    await page.setViewportSize({ width: 412, height: 915 });
    await loginAs(page, "demo-ph@cloie.test");
    await page.goto(`/program-head/programs/${bsit.id}/reports`);
    await expect(page.getByRole("button", { name: "Export course workbook" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("refuses named-response downloads to other roles and other Programs", async ({ page }) => {
    const { bsit, beed } = fixture();

    // Requests are issued from inside a settled public page so the browser's own
    // session cookie travels with them; a request without that cookie would be
    // refused anyway and would prove nothing.
    const exportStatus = (kind: string) =>
      page.evaluate(
        async ([programId, exportKind]) => {
          const response = await fetch(
            `/api/program-head/programs/${programId}/reports/export?kind=${exportKind}`
          );
          return response.status;
        },
        [bsit.id, kind] as const
      );

    await loginAs(page, "demo-faculty@cloie.test");
    await page.goto("/terms");
    expect(await exportStatus("raw-csv")).toBe(403);
    // The Faculty workspace has no Program Head reports surface at all.
    await page.goto(`/program-head/programs/${bsit.id}/reports`);
    await expect(page.getByRole("button", { name: "Export raw quantitative CSV" })).toHaveCount(0);

    // The BEED Program Head owns BEED, never BSIT.
    await loginAs(page, "ph-beed@cloie.test");
    await page.goto("/terms");
    expect(await exportStatus("course-workbook")).toBe(403);
    // An unassigned Program is denied, not redirected into another workspace.
    await page.goto(`/program-head/programs/${bsit.id}/reports`);
    await expect(page.getByRole("button", { name: "Export course workbook" })).toHaveCount(0);

    // The same account still exports its own Program, so the refusal above is
    // about scope rather than a broken session.
    await page.goto(`/program-head/programs/${beed.id}/reports`);
    await expect(page.getByRole("button", { name: "Export raw quantitative CSV" })).toBeVisible();
  });
});
