import { describe, expect, it } from "vitest";

import {
  GO_IMPORT_MAX_ROWS,
  GO_IMPORT_TEMPLATE,
  exportFailedGOImportRows,
  parseGOImportCsv,
} from "@/features/outcomes/services/go-import-csv";

describe("GO import CSV", () => {
  it("provides a two-column Excel-friendly template", () => {
    expect(GO_IMPORT_TEMPLATE).toBe("\uFEFFGO Code,Description\r\n");
  });

  it("accepts friendly headers in either order and preserves source rows", () => {
    expect(
      parseGOImportCsv(
        'description,go_code\r\n"Analyze, design, and test", go-1 \r\n"Explain ""ethical"" choices\nacross contexts",GO-2\r\n'
      )
    ).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          input: { go_code: " go-1 ", description: "Analyze, design, and test" },
        },
        {
          sourceIndex: 3,
          input: { go_code: "GO-2", description: 'Explain "ethical" choices\nacross contexts' },
        },
      ],
    });
  });

  it("accepts exactly twenty nonblank rows and rejects twenty-one", () => {
    const rows = Array.from(
      { length: GO_IMPORT_MAX_ROWS },
      (_, index) => `GO-${index + 1},Outcome ${index + 1}`
    );
    expect(parseGOImportCsv(`GO Code,Description\n${rows.join("\n")}\n\n`)).toMatchObject({
      success: true,
    });

    const tooMany = [...rows, "GO-21,Outcome 21"];
    expect(parseGOImportCsv(`GO Code,Description\n${tooMany.join("\n")}`)).toEqual({
      success: false,
      error:
        "This file contains 21 GO rows. Each import can contain up to 20. Remove 1 row or split the file into smaller files, then try again.",
    });
  });

  it.each([
    ["", "The CSV file is empty."],
    ["GO Code,Description\n", "Add at least one GO row to the CSV file."],
    [
      "code,text\nGO-1,Outcome",
      "Use the Graduate Outcome import template. Expected columns: GO Code, Description.",
    ],
    [
      "GO Code,Description,Status\nGO-1,Outcome,Active",
      "Use the Graduate Outcome import template. Expected columns: GO Code, Description.",
    ],
  ])("rejects an invalid file", (csv, error) => {
    expect(parseGOImportCsv(csv)).toEqual({ success: false, error });
  });

  it("accepts the legacy PLO Code header for compatibility", () => {
    expect(parseGOImportCsv("PLO Code,Description\nPLO-1,Outcome")).toEqual({
      success: true,
      rows: [{ sourceIndex: 2, input: { go_code: "PLO-1", description: "Outcome" } }],
    });
  });

  it("exports reusable rows to fix without internal statuses", () => {
    expect(
      exportFailedGOImportRows([
        { goCode: "GO-1", description: '=HYPERLINK("bad")', error: "Description is invalid." },
      ])
    ).toBe(
      '\uFEFFGO Code,Description,Error\r\nGO-1,"\'=HYPERLINK(""bad"")",Description is invalid.\r\n'
    );
  });

  it("re-accepts the generated rows-to-fix file and ignores its Error column", () => {
    const correction = exportFailedGOImportRows([
      { goCode: "GO-1", description: "Correct this outcome", error: "Already exists." },
    ]);
    expect(parseGOImportCsv(correction)).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          input: { go_code: "GO-1", description: "Correct this outcome" },
        },
      ],
    });
  });
});
