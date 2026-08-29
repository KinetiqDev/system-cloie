import { describe, expect, it } from "vitest";

import {
  PLO_IMPORT_MAX_ROWS,
  PLO_IMPORT_TEMPLATE,
  exportFailedPLOImportRows,
  parsePLOImportCsv,
} from "@/features/outcomes/services/plo-import-csv";

describe("PLO import CSV", () => {
  it("provides a two-column Excel-friendly template", () => {
    expect(PLO_IMPORT_TEMPLATE).toBe("\uFEFFPLO Code,Description\r\n");
  });

  it("accepts friendly headers in either order and preserves source rows", () => {
    expect(
      parsePLOImportCsv(
        'description,plo_code\r\n"Analyze, design, and test", plo-1 \r\n"Explain ""ethical"" choices\nacross contexts",PLO-2\r\n'
      )
    ).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          input: { plo_code: " plo-1 ", description: "Analyze, design, and test" },
        },
        {
          sourceIndex: 3,
          input: { plo_code: "PLO-2", description: 'Explain "ethical" choices\nacross contexts' },
        },
      ],
    });
  });

  it("accepts exactly twenty nonblank rows and rejects twenty-one", () => {
    const rows = Array.from(
      { length: PLO_IMPORT_MAX_ROWS },
      (_, index) => `PLO-${index + 1},Outcome ${index + 1}`
    );
    expect(parsePLOImportCsv(`PLO Code,Description\n${rows.join("\n")}\n\n`)).toMatchObject({
      success: true,
    });

    const tooMany = [...rows, "PLO-21,Outcome 21"];
    expect(parsePLOImportCsv(`PLO Code,Description\n${tooMany.join("\n")}`)).toEqual({
      success: false,
      error:
        "This file contains 21 PLO rows. Each import can contain up to 20. Remove 1 row or split the file into smaller files, then try again.",
    });
  });

  it.each([
    ["", "The CSV file is empty."],
    ["PLO Code,Description\n", "Add at least one PLO row to the CSV file."],
    [
      "code,text\nPLO-1,Outcome",
      "Use the Program Learning Outcome import template. Expected columns: PLO Code, Description.",
    ],
    [
      "PLO Code,Description,Status\nPLO-1,Outcome,Active",
      "Use the Program Learning Outcome import template. Expected columns: PLO Code, Description.",
    ],
  ])("rejects an invalid file", (csv, error) => {
    expect(parsePLOImportCsv(csv)).toEqual({ success: false, error });
  });

  it("exports reusable rows to fix without internal statuses", () => {
    expect(
      exportFailedPLOImportRows([
        { ploCode: "PLO-1", description: '=HYPERLINK("bad")', error: "Description is invalid." },
      ])
    ).toBe(
      '\uFEFFPLO Code,Description,Error\r\nPLO-1,"\'=HYPERLINK(""bad"")",Description is invalid.\r\n'
    );
  });

  it("re-accepts the generated rows-to-fix file and ignores its Error column", () => {
    const correction = exportFailedPLOImportRows([
      { ploCode: "PLO-1", description: "Correct this outcome", error: "Already exists." },
    ]);
    expect(parsePLOImportCsv(correction)).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          input: { plo_code: "PLO-1", description: "Correct this outcome" },
        },
      ],
    });
  });
});
