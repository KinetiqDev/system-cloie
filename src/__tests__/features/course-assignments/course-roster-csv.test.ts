import { describe, expect, it } from "vitest";

import {
  COURSE_ROSTER_MAX_ROWS,
  exportFailedCourseRosterRows,
  parseCourseRosterCsv,
} from "@/features/course-assignments/services/course-roster-csv";

describe("course roster CSV", () => {
  it("accepts UTF-8 BOM and Windows line endings", () => {
    expect(parseCourseRosterCsv("\uFEFFemail\r\n STUDENT@EXAMPLE.COM \r\n")).toEqual({
      success: true,
      rows: [{ sourceIndex: 2, submittedEmail: " STUDENT@EXAMPLE.COM ", normalizedEmail: "student@example.com" }],
    });
  });

  it.each(["", "email\n", "Email\na@example.com\n", "email,name\na@example.com,b\n", "email\n\"a@example.com\"\n", "email\na@example.com,b\n", "email\na@example.com\n\n"]) (
    "rejects invalid structure: %j",
    (input) => {
      expect(parseCourseRosterCsv(input)).toMatchObject({ success: false });
    }
  );

  it("accepts exactly 500 rows and rejects 501 rows", () => {
    const rows = Array.from({ length: COURSE_ROSTER_MAX_ROWS }, (_, index) => `student${index}@example.com`);
    expect(parseCourseRosterCsv(`email\n${rows.join("\n")}\n`)).toMatchObject({ success: true });
    expect(parseCourseRosterCsv(`email\n${[...rows, "extra@example.com"].join("\n")}\n`)).toMatchObject({
      success: false,
    });
  });

  it("rejects invalid UTF-8 bytes before row parsing", () => {
    expect(parseCourseRosterCsv(new Uint8Array([0x65, 0x6d, 0x61, 0x69, 0x6c, 0x0a, 0xc3, 0x28]))).toEqual(
      expect.objectContaining({ success: false })
    );
  });

  it("exports only failed and unprocessed email/error rows", () => {
    const csv = exportFailedCourseRosterRows([
      { status: "CREATED", email: "ok@example.com", error: "" },
      { status: "DUPLICATE_EMAIL", email: "duplicate@example.com", error: "Duplicate email in this upload." },
      { status: "UNPROCESSED", email: "later@example.com", error: "This row was not processed because import stopped unexpectedly. Support reference: ref-1." },
    ]);

    expect(csv).toBe(
      "email,error\nduplicate@example.com,Duplicate email in this upload.\nlater@example.com,This row was not processed because import stopped unexpectedly.\n"
    );
    expect(csv).not.toContain("ok@example.com");
    expect(csv).not.toContain("ref-1");
  });
});
