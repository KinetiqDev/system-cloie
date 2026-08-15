import { describe, expect, it } from "vitest";

import {
  COURSE_ROSTER_MAX_ROWS,
  exportFailedCourseRosterRows,
  parseCourseRosterCsv,
} from "@/features/course-assignments/services/course-roster-csv";

describe("course roster CSV", () => {
  it("accepts UTF-8 BOM, Windows line endings, standard quoting, and repeated names", () => {
    expect(
      parseCourseRosterCsv(
        '\uFEFF Student Name \r\n" Maria, \""May\"" Santos "\r\nMaria Santos\r\nMaria Santos\r\n'
      )
    ).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          submittedName: ' Maria, "May" Santos ',
          normalizedName: 'Maria, "May" Santos',
          status: "VALID",
          error: "",
        },
        {
          sourceIndex: 3,
          submittedName: "Maria Santos",
          normalizedName: "Maria Santos",
          status: "VALID",
          error: "",
        },
        {
          sourceIndex: 4,
          submittedName: "Maria Santos",
          normalizedName: "Maria Santos",
          status: "VALID",
          error: "",
        },
      ],
    });
  });

  it.each([
    "",
    "name\n",
    "email\nMaria Santos\n",
    "name,program\nMaria Santos,BSCS\n",
    "name\nMaria Santos,BSCS\n",
    "name\n\"unterminated\n",
    "name\n\"Maria Santos\" trailing\n",
  ])(
    "rejects invalid structure: %j",
    (input) => {
      expect(parseCourseRosterCsv(input)).toMatchObject({ success: false });
    }
  );

  it("ignores blank rows and accepts exactly 100 source rows", () => {
    const rows = Array.from({ length: COURSE_ROSTER_MAX_ROWS }, (_, index) => `Student ${index}`);
    expect(parseCourseRosterCsv(`name\n\n${rows.join("\n")}\n  \n`)).toMatchObject({ success: true });
    expect(parseCourseRosterCsv(`name\n${[...rows, "Extra Student"].join("\n")}\n`)).toMatchObject({
      success: false,
    });
  });

  it("retains unusable names as invalid rows", () => {
    const tooLongName = "a".repeat(201);
    expect(parseCourseRosterCsv(`name\nMaria Santos\n${tooLongName}\n`)).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          submittedName: "Maria Santos",
          normalizedName: "Maria Santos",
          status: "VALID",
          error: "",
        },
        {
          sourceIndex: 3,
          submittedName: tooLongName,
          normalizedName: "a".repeat(201),
          status: "INVALID_NAME",
          error: "Name must contain 1 to 200 characters.",
        },
      ],
    });
  });

  it("rejects invalid UTF-8 bytes before row parsing", () => {
    expect(parseCourseRosterCsv(new Uint8Array([0x65, 0x6d, 0x61, 0x69, 0x6c, 0x0a, 0xc3, 0x28]))).toEqual(
      expect.objectContaining({ success: false })
    );
  });

  it("exports only failed and unprocessed name/error rows", () => {
    const csv = exportFailedCourseRosterRows([
      { sourceIndex: 2, status: "CREATED", name: "Maria Santos", error: "" },
      { sourceIndex: 3, status: "INVALID_NAME", name: "Maria, Santos", error: "Name is too long." },
      { sourceIndex: 4, status: "UNPROCESSED", name: "Later Student", error: "This row was not processed because import stopped unexpectedly. Support reference: ref-1." },
    ]);

    expect(csv).toBe(
      'row,name,status,error\n3,"Maria, Santos",INVALID_NAME,Name is too long.\n4,Later Student,UNPROCESSED,This row was not processed because import stopped unexpectedly.\n'
    );
    expect(csv).not.toContain("Maria Santos");
    expect(csv).not.toContain("ref-1");
  });
});
