import { describe, expect, it } from "vitest";

import {
  COURSE_IMPORT_MAX_ROWS,
  COURSE_IMPORT_TEMPLATES,
  parseCourseImportCsv,
} from "@/features/academic-structure/services/course-import-csv";

describe("course import CSV", () => {
  it("parses a Secretary file with quoted titles and preserves source rows", () => {
    const result = parseCourseImportCsv(
      '\uFEFFcourse_code,course_title,course_scope,program_code,major_name,year_level,semester,term\r\nIT 101,"Computing, Society",PROGRAM_SPECIFIC,BSIT,Software Engineering,FIRST_YEAR,FIRST,FIRST_TERM\r\n',
      "secretary"
    );

    expect(result).toEqual({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          course_code: "IT 101",
          course_title: "Computing, Society",
          course_scope: "PROGRAM_SPECIFIC",
          program_code: "BSIT",
          major_name: "Software Engineering",
          year_level: "FIRST_YEAR",
          semester: "FIRST",
          term: "FIRST_TERM",
        },
      ],
    });
  });

  it("uses the selected Program shape without accepting scope columns", () => {
    const result = parseCourseImportCsv(
      "course_code,course_title,course_type,major_name,year_level,semester,term\nIT 101,Computing,PROGRAM_WIDE,,,FIRST,SECOND_TERM\n",
      "program-head"
    );

    expect(result).toMatchObject({
      success: true,
      rows: [
        {
          sourceIndex: 2,
          course_code: "IT 101",
          course_type: "PROGRAM_WIDE",
          major_name: "",
          semester: "FIRST",
          term: "SECOND_TERM",
        },
      ],
    });
    if (result.success) expect(result.rows[0]).not.toHaveProperty("course_scope");
  });

  it("rejects a malformed structure and oversized data set before preview", () => {
    expect(
      parseCourseImportCsv("course_code,course_title\nIT101,Computing\n", "general-education")
    ).toEqual({
      success: false,
      error: expect.stringContaining("columns"),
    });

    const rows = Array.from(
      { length: COURSE_IMPORT_MAX_ROWS + 1 },
      (_, index) => `GE${index},Course ${index},FIRST_YEAR,FIRST,FIRST_TERM`
    );
    expect(
      parseCourseImportCsv(
        `course_code,course_title,year_level,semester,term\n${rows.join("\n")}`,
        "general-education"
      )
    ).toEqual({ success: false, error: expect.stringContaining("100") });
  });

  it("ships templates with role-specific headers", () => {
    expect(COURSE_IMPORT_TEMPLATES.secretary).toContain("program_code");
    expect(COURSE_IMPORT_TEMPLATES["program-head"]).toContain("course_type");
    expect(COURSE_IMPORT_TEMPLATES["general-education"]).not.toContain("program_code");
  });
});
