import { describe, expect, it } from "vitest";
import {
  exportStudentImportRows,
  parseStudentImport,
  STUDENT_IMPORT_TEMPLATE,
} from "@/features/users/services/student-import-csv";
const catalog = [
  { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", code: "BSIT", name: "IT", majors: [] },
];
const parse = (text: string) => parseStudentImport(new TextEncoder().encode(text), catalog);
const row = '"Dela Cruz, Ana", ANA@ACD.EDU.PH , bsit , ,1,morning';
describe("Student import CSV", () => {
  it("accepts BOM, CRLF, quoted names, mixed capitalization and spaces", () => {
    const result = parse(`\uFEFF${STUDENT_IMPORT_TEMPLATE.replace("\n", "\r\n")}${row}\r\n`);
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.rows[0]?.data).toMatchObject({
        name: "Dela Cruz, Ana",
        email: "ana@acd.edu.ph",
        year_level: "FIRST_YEAR",
        section: "MORNING",
      });
  });
  it("allows reordered case-insensitive headers and blank lines", () => {
    const result = parse(
      "EMAIL,NAME,SECTION,YEAR_LEVEL,MAJOR_NAME,PROGRAM_CODE\na@acd.edu.ph,Ana,Evening,FOURTH_YEAR,,BSIT\n\n"
    );
    expect(result.success && result.rows[0]?.status).toBe("Ready");
  });
  it("flags every duplicate normalized email", () => {
    const result = parse(`${STUDENT_IMPORT_TEMPLATE}${row}\nAna,ana@acd.edu.ph,BSIT,,2,Evening`);
    expect(result.success && result.rows.every((r) => r.status === "Needs correction")).toBe(true);
  });
  it.each([
    "",
    "name,name,email,program_code,year_level,section\n",
    `${STUDENT_IMPORT_TEMPLATE}\"unterminated`,
    `${STUDENT_IMPORT_TEMPLATE}${Array(101).fill(row).join("\n")}`,
  ])("rejects invalid structure or row limits", (text) => expect(parse(text).success).toBe(false));
  it("rejects invalid UTF-8 and oversized data", () => {
    expect(parseStudentImport(new Uint8Array([255]), catalog).success).toBe(false);
    expect(parseStudentImport(new Uint8Array(256 * 1024 + 1), catalog).success).toBe(false);
  });
  it.each(["gmail.com", "sub.acd.edu.ph"])("rejects noninstitutional email %s", (domain) => {
    const result = parse(`${STUDENT_IMPORT_TEMPLATE}Ana,ana@${domain},BSIT,,1,Morning`);
    expect(result.success && result.rows[0]?.status).toBe("Needs correction");
  });
  it("requires active major, rejects ambiguity and wrong column counts", () => {
    const bytes = new TextEncoder().encode(`${STUDENT_IMPORT_TEMPLATE}${row}`);
    expect(
      parseStudentImport(bytes, [
        { ...catalog[0]!, majors: [{ id: catalog[0]!.id, name: "Computing" }] },
      ])
    ).toMatchObject({ rows: [{ status: "Needs correction" }] });
    expect(parseStudentImport(bytes, [...catalog, ...catalog])).toMatchObject({
      rows: [{ status: "Needs correction" }],
    });
    expect(parse(`${STUDENT_IMPORT_TEMPLATE}${row},extra`)).toMatchObject({
      rows: [{ status: "Needs correction" }],
    });
  });
  it("exports reusable quoted correction CSV with formula protection", () => {
    const result = parse(`${STUDENT_IMPORT_TEMPLATE}=HYPERLINK(),ana@acd.edu.ph,BSIT,,1,Morning`);
    if (!result.success) throw new Error("parse");
    expect(exportStudentImportRows(result.rows)).toContain('"\'=HYPERLINK()"');
  });
});
