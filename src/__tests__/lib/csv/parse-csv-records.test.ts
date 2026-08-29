import { describe, expect, it } from "vitest";

import { parseCsvRecords } from "@/lib/csv/parse-csv-records";

describe("parseCsvRecords", () => {
  it("parses BOM, CRLF, quoted commas, escaped quotes, and multiline cells", () => {
    expect(
      parseCsvRecords(
        '\uFEFFPLO Code,Description\r\nPLO-1,"Analyze, design, and test"\r\nPLO-2,"Explain ""ethical"" choices\nacross contexts"\r\n'
      )
    ).toEqual({
      success: true,
      records: [
        { sourceIndex: 1, cells: ["PLO Code", "Description"] },
        { sourceIndex: 2, cells: ["PLO-1", "Analyze, design, and test"] },
        { sourceIndex: 3, cells: ["PLO-2", 'Explain "ethical" choices\nacross contexts'] },
      ],
    });
  });

  it("rejects malformed quoting and invalid UTF-8", () => {
    expect(parseCsvRecords('code,description\nPLO-1,"Unclosed')).toEqual({
      success: false,
      reason: "structure",
    });
    expect(parseCsvRecords(new Uint8Array([0xc3, 0x28]))).toEqual({
      success: false,
      reason: "encoding",
    });
  });
});
