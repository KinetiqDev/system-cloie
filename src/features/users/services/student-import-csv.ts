import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { parseCsvRecords } from "@/lib/csv/parse-csv-records";
import {
  createUserBySecretarySchema,
  type CreateUserBySecretaryInput,
} from "../schemas/create-user";

const STUDENT_IMPORT_HEADERS = [
  "name",
  "email",
  "program_code",
  "major_name",
  "year_level",
  "section",
] as const;
export const STUDENT_IMPORT_TEMPLATE = `${STUDENT_IMPORT_HEADERS.join(",")}\n`;
export const STUDENT_IMPORT_MAX_BYTES = 256 * 1024;
const STUDENT_IMPORT_MAX_ROWS = 100;
type StudentImportInput = Record<(typeof STUDENT_IMPORT_HEADERS)[number], string>;
export type StudentImportCatalog = Array<{
  id: string;
  code: string;
  name: string;
  majors: Array<{ id: string; name: string }>;
}>;
export type StudentImportRow = {
  line: number;
  input: StudentImportInput;
  status: "Ready" | "Skipped" | "Needs correction" | "Created" | "Failed";
  message: string;
  data?: CreateUserBySecretaryInput;
};
const matchImportValue = (value: string) => value.trim().replace(/\s+/gu, " ").toLowerCase();

export function parseStudentImport(
  input: Uint8Array,
  catalog: StudentImportCatalog
): { success: true; rows: StudentImportRow[] } | { success: false; error: string } {
  if (input.byteLength > STUDENT_IMPORT_MAX_BYTES)
    return { success: false, error: "Choose a CSV no larger than 256 KiB." };
  const parsed = parseCsvRecords(input);
  if (!parsed.success)
    return {
      success: false,
      error:
        parsed.reason === "encoding"
          ? "Save the file as CSV UTF-8 and try again."
          : "The CSV has malformed quotes or line endings. Use the downloaded template.",
    };
  const [header, ...records] = parsed.records;
  const headers = header?.cells.map(matchImportValue) ?? [];
  if (
    headers.length !== STUDENT_IMPORT_HEADERS.length ||
    new Set(headers).size !== headers.length ||
    STUDENT_IMPORT_HEADERS.some((h) => !headers.includes(h))
  )
    return {
      success: false,
      error: `Use these columns once each: ${STUDENT_IMPORT_HEADERS.join(", ")}.`,
    };
  const nonblank = records.filter((r) => r.cells.some((c) => c.trim()));
  if (!nonblank.length || nonblank.length > STUDENT_IMPORT_MAX_ROWS)
    return { success: false, error: "Upload 1 to 100 students at a time." };
  const emails = new Map<string, number>();
  const rows: StudentImportRow[] = nonblank.map((record) => {
    const values = Object.fromEntries(
      STUDENT_IMPORT_HEADERS.map((h) => [h, record.cells[headers.indexOf(h)]?.trim() ?? ""])
    ) as StudentImportInput;
    const row: StudentImportRow = {
      line: record.sourceIndex,
      input: values,
      status: "Needs correction",
      message: "",
    };
    if (record.cells.length !== headers.length)
      return { ...row, message: "This row must contain exactly six columns." };
    const email = values.email.toLowerCase();
    emails.set(email, (emails.get(email) ?? 0) + 1);
    const programs = catalog.filter(
      (p) => matchImportValue(p.code) === matchImportValue(values.program_code)
    );
    if (programs.length !== 1)
      return {
        ...row,
        message: "Program code must match one active program. Check the program reference.",
      };
    const program = programs[0]!;
    const major = resolveImportMajor(program, values.major_name);
    if (!major.success) return { ...row, message: major.error };
    const year = parseYearLevel(values.year_level);
    if (!year) return { ...row, message: "year_level must be 1, 2, 3, or 4." };
    if (!Object.values(StudentSection).includes(values.section.toUpperCase() as StudentSection))
      return { ...row, message: "section must be Morning, Afternoon, or Evening." };
    const validated = createUserBySecretarySchema.safeParse({
      name: values.name,
      email,
      role: SystemRole.STUDENT,
      program_id: program.id,
      major_id: major.id,
      year_level: year,
      section: values.section.toUpperCase() as StudentSection,
    });
    if (!validated.success)
      return { ...row, message: validated.error.issues.map((i) => i.message).join(" ") };
    return { ...row, status: "Ready", message: "New Student account", data: validated.data };
  });
  return {
    success: true,
    rows: rows.map((row) =>
      (emails.get(row.input.email.toLowerCase()) ?? 0) > 1
        ? {
            ...row,
            status: "Needs correction",
            message: "This email appears more than once in the file. Keep only one row.",
            data: undefined,
          }
        : row
    ),
  };
}

export function exportStudentImportRows(rows: StudentImportRow[]): string {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+\-@]/u.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return `${STUDENT_IMPORT_TEMPLATE}${rows.map((row) => STUDENT_IMPORT_HEADERS.map((h) => cell(row.input[h])).join(",")).join("\n")}\n`;
}

function parseYearLevel(value: string): YearLevel | undefined {
  const years = [
    YearLevel.FIRST_YEAR,
    YearLevel.SECOND_YEAR,
    YearLevel.THIRD_YEAR,
    YearLevel.FOURTH_YEAR,
  ];
  const year = /^[1-4]$/u.test(value) ? years[Number(value) - 1] : value.toUpperCase();
  return years.find((candidate) => candidate === year);
}

function resolveImportMajor(program: StudentImportCatalog[number], name: string) {
  const majors = program.majors.filter(
    (major) => matchImportValue(major.name) === matchImportValue(name)
  );
  if (program.majors.length === 0 && !name) return { success: true as const, id: undefined };
  if (majors.length === 1) return { success: true as const, id: majors[0]!.id };
  return {
    success: false as const,
    error:
      "Enter one active major for this program, or leave it blank if the program has no majors.",
  };
}
