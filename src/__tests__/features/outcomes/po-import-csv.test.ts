import { describe, expect, it } from "vitest";

import {
  PO_IMPORT_MAX_ROWS,
  PO_IMPORT_TEMPLATE,
  exportFailedPOImportRows,
  parsePOImportCsv,
} from "@/features/outcomes/services/po-import-csv";

describe("PO import CSV", () => {
  it("provides a two-column Excel-friendly template", () => {
    expect(PO_IMPORT_TEMPLATE).toBe("\uFEFFPO Code,Description\r\n");
  });

  it("accepts friendly headers in either order and preserves source rows", () => {
    expect(
      parsePOImportCsv(
        'description,po_code\r\n"Analyze, design, and test", po-1 \r\n"Explain ""ethical"" choices\nacross contexts",PO-2\r\n'
      )
    ).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          input: { po_code: " po-1 ", description: "Analyze, design, and test" },
        },
        {
          sourceIndex: 3,
          input: { po_code: "PO-2", description: 'Explain "ethical" choices\nacross contexts' },
        },
      ],
    });
  });

  it("accepts exactly twenty nonblank rows and rejects twenty-one", () => {
    const rows = Array.from(
      { length: PO_IMPORT_MAX_ROWS },
      (_, index) => `PO-${index + 1},Outcome ${index + 1}`
    );
    expect(parsePOImportCsv(`PO Code,Description\n${rows.join("\n")}\n\n`)).toMatchObject({
      success: true,
    });

    const tooMany = [...rows, "PO-21,Outcome 21"];
    expect(parsePOImportCsv(`PO Code,Description\n${tooMany.join("\n")}`)).toEqual({
      success: false,
      error:
        "This file contains 21 PO rows. Each import can contain up to 20. Remove 1 row or split the file into smaller files, then try again.",
    });
  });

  it.each([
    ["", "The CSV file is empty."],
    ["PO Code,Description\n", "Add at least one PO row to the CSV file."],
    [
      "code,text\nPO-1,Outcome",
      "Use the Program Outcome import template. Expected columns: PO Code, Description, with an optional Classification column.",
    ],
    [
      "PO Code,Description,Status\nPO-1,Outcome,Active",
      "Use the Program Outcome import template. Expected columns: PO Code, Description, with an optional Classification column.",
    ],
  ])("rejects an invalid file", (csv, error) => {
    expect(parsePOImportCsv(csv)).toEqual({ success: false, error });
  });

  it("accepts the legacy PLO Code header for compatibility", () => {
    expect(parsePOImportCsv("PLO Code,Description\nPLO-1,Outcome")).toEqual({
      success: true,
      rows: [{ sourceIndex: 2, input: { po_code: "PLO-1", description: "Outcome" } }],
    });
  });

  it("exports reusable rows to fix without internal statuses", () => {
    expect(
      exportFailedPOImportRows([
        {
          poCode: "PO-1",
          description: '=HYPERLINK("bad")',
          classification: "CORE",
          error: "Description is invalid.",
        },
      ])
    ).toBe(
      '\uFEFFPO Code,Description,Classification,Error\r\nPO-1,"\'=HYPERLINK(""bad"")",Core,Description is invalid.\r\n'
    );
  });

  it("re-accepts the generated rows-to-fix file and ignores its Error column", () => {
    const correction = exportFailedPOImportRows([
      {
        poCode: "PO-1",
        description: "Correct this outcome",
        classification: "PROFESSIONAL",
        error: "Already exists.",
      },
    ]);
    expect(parsePOImportCsv(correction)).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          input: {
            po_code: "PO-1",
            description: "Correct this outcome",
            classification: "Professional",
          },
        },
      ],
    });
  });

  it("round-trips a rejected row's category so recovery cannot silently reclassify it", () => {
    const recovery = exportFailedPOImportRows([
      {
        poCode: "PO-7",
        description: "No",
        classification: "PROFESSIONAL",
        error: "Description must be at least 3 characters.",
      },
    ]);
    const reparsed = parsePOImportCsv(recovery);
    expect(reparsed.success).toBe(true);
    if (!reparsed.success) return;
    // The Program Head repairs only the description; the category survives the
    // repair, so reimporting under a Core dialog selection stays Professional.
    const repaired = reparsed.rows.map((row) => ({
      sourceIndex: row.sourceIndex,
      input: { ...row.input, description: "Repaired professional outcome" },
    }));
    expect(repaired[0]?.input.classification?.trim().toUpperCase()).toBe("PROFESSIONAL");
  });

  it("writes an empty Classification cell when a row supplied no category at all", () => {
    expect(
      exportFailedPOImportRows([{ poCode: "PO-1", description: "Outcome", error: "Not created." }])
    ).toBe("\uFEFFPO Code,Description,Classification,Error\r\nPO-1,Outcome,,Not created.\r\n");
  });

  it("keeps a rejected administrative category raw so reimport cannot silently convert it", () => {
    // A Common row cannot enter a Program Head import. Repairing only its
    // description must not silently turn it into the dialog's Core category;
    // the raw value has to survive so the row stays rejected until changed.
    const recovery = exportFailedPOImportRows([
      {
        poCode: "PO-9",
        description: "No",
        sourceClassification: "Common",
        error: "Select Core or Professional for this import.",
      },
    ]);
    expect(recovery).toContain("PO-9,No,Common,");

    const reparsed = parsePOImportCsv(recovery);
    expect(reparsed.success).toBe(true);
    if (!reparsed.success) return;
    expect(reparsed.rows[0]?.input.classification).toBe("Common");
  });
});
