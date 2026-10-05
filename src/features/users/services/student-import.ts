import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { EnrollmentSource, Prisma, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { buildPeriodLabel } from "@/features/response-review/services/period-label";
import {
  parseStudentImport,
  type StudentImportCatalog,
  type StudentImportRow,
} from "./student-import-csv";

export async function readStudentImportContext() {
  const [programs, term] = await Promise.all([
    prisma.program.findMany({
      where: { is_active: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        majors: {
          where: { is_active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.academicTermInstance.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, semester: true, term: true, school_year: { select: { code: true } } },
    }),
  ]);
  return {
    programs,
    termId: term?.id ?? null,
    termLabel: term
      ? buildPeriodLabel({
          school_year: term.school_year,
          semester: term.semester,
          term: term.term,
        })
      : null,
  };
}

type ImportContext = {
  programs: StudentImportCatalog;
  termId: string | null;
  termLabel: string | null;
};
const digest = (bytes: Uint8Array, context: ImportContext) =>
  createHash("sha256").update(bytes).update(JSON.stringify(context)).digest("hex");
const sign = (payload: string) =>
  createHmac("sha256", getConfirmationSecret()).update(payload).digest("hex");

export async function previewStudentImport(bytes: Uint8Array, actor: string) {
  const context = await readStudentImportContext();
  const parsed = parseStudentImport(bytes, context.programs);
  if (!parsed.success) return parsed;
  const emails = [...new Set(parsed.rows.map((r) => r.input.email.toLowerCase()))];
  const existing = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email.toLowerCase()));
  const rows = parsed.rows.map((row) =>
    row.status === "Ready" && existingEmails.has(row.input.email.toLowerCase())
      ? {
          ...row,
          status: "Skipped" as const,
          message:
            "An account with this email already exists. No account, role, or placement will be changed.",
          data: undefined,
        }
      : row
  );
  const payload = JSON.stringify({
    actor,
    hash: digest(bytes, context),
    expires: Date.now() + 15 * 60 * 1000,
  });
  return {
    success: true as const,
    rows,
    termId: context.termId,
    termLabel: context.termLabel,
    token: `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`,
  };
}

export async function commitStudentImport(bytes: Uint8Array, actor: string, token: string) {
  const context = await readStudentImportContext();
  if (!isCurrentReview(bytes, actor, token, context))
    return {
      success: false as const,
      error:
        "The file or academic context changed, or the review expired. Review the file again before importing.",
    };
  const parsed = parseStudentImport(bytes, context.programs);
  if (!parsed.success) return parsed;
  const existing = await prisma.user.findMany({
    where: { email: { in: parsed.rows.map((r) => r.input.email.toLowerCase()) } },
    select: { email: true },
  });
  const emails = new Set(existing.map((u) => u.email.toLowerCase()));
  if (parsed.rows.some((r) => r.status === "Needs correction"))
    return {
      success: false as const,
      error: "Correct the invalid rows and review the file again.",
    };
  const rows: StudentImportRow[] = [];
  for (const row of parsed.rows) {
    if (emails.has(row.input.email.toLowerCase())) {
      rows.push({
        ...row,
        status: "Skipped",
        message: "An account with this email already exists. Nothing was changed.",
        data: undefined,
      });
      continue;
    }
    try {
      const data = row.data!;
      await createImportedStudent(data, context);
      rows.push({
        ...row,
        status: "Created",
        message: context.termId
          ? "Account and current-period enrollment created."
          : "Account created. Enrollment is deferred until an academic period is active.",
        data: undefined,
      });
    } catch (error) {
      rows.push(await failedImportRow(row, error));
    }
  }
  return { success: true as const, rows };
}

function isCurrentReview(bytes: Uint8Array, actor: string, token: string, context: ImportContext) {
  try {
    const [encoded, signature] = token.split(".");
    const payload = Buffer.from(encoded ?? "", "base64url").toString();
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature ?? "");
    const decoded = JSON.parse(payload) as { actor: string; hash: string; expires: number };
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected) ||
      decoded.actor !== actor ||
      decoded.hash !== digest(bytes, context) ||
      !(decoded.expires > Date.now())
    )
      throw new Error("stale");
  } catch {
    return false;
  }
  return true;
}

async function createImportedStudent(
  data: NonNullable<StudentImportRow["data"]>,
  context: ImportContext
) {
  await prisma.$transaction(
    async (tx) => {
      const [program, term] = await Promise.all([
        tx.program.findUnique({
          where: { id: data.program_id! },
          select: {
            is_active: true,
            majors: { where: { is_active: true }, select: { id: true } },
          },
        }),
        tx.academicTermInstance.findFirst({
          where: { status: "ACTIVE" },
          select: { id: true },
        }),
      ]);
      if ((term?.id ?? null) !== context.termId) throw new Error("PERIOD_CHANGED");
      validateImportPlacement(program, data);
      const user = await tx.user.create({
        data: { name: data.name, email: data.email, is_active: true },
      });
      await tx.userRole.create({ data: { user_id: user.id, role: SystemRole.STUDENT } });
      await tx.studentAcademicProfile.create({
        data: {
          user_id: user.id,
          program_id: data.program_id!,
          major_id: data.major_id ?? null,
        },
      });
      if (term)
        await tx.studentEnrollment.create({
          data: {
            student_user_id: user.id,
            term_instance_id: term.id,
            program_id: data.program_id!,
            major_id: data.major_id ?? null,
            year_level: data.year_level!,
            section: data.section!,
            source: EnrollmentSource.SECRETARY,
          },
        });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function failedImportRow(row: StudentImportRow, error: unknown): Promise<StudentImportRow> {
  const raced = isUniqueConstraintError(error)
    ? await prisma.user.findUnique({ where: { email: row.data!.email }, select: { id: true } })
    : null;
  return {
    ...row,
    data: undefined,
    status: raced ? "Skipped" : "Failed",
    message: raced
      ? "An account with this email was created during import. Nothing was changed."
      : error instanceof Error && error.message === "PERIOD_CHANGED"
        ? "The active academic period changed during import. Earlier successful rows remain created in the reviewed period. Review the file again before retrying the remaining rows."
        : "This row was not created. Review the file again and retry; successful rows will be skipped.",
  };
}

function validateImportPlacement(
  program: { is_active: boolean; majors: { id: string }[] } | null,
  data: NonNullable<StudentImportRow["data"]>
) {
  if (!program?.is_active) throw new Error("CONTEXT_CHANGED");
  if (program.majors.length === 0 && !data.major_id) return;
  if (!program.majors.some((major) => major.id === data.major_id))
    throw new Error("CONTEXT_CHANGED");
}
