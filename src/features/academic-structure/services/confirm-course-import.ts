import { CourseScope } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";

import { createCourse } from "./manage-courses";
import { createGenEdCourse } from "./manage-gen-ed-courses";
import { createProgramHeadCourse } from "./manage-program-head-courses";
import { previewCourseImport } from "./preview-course-import";
import type { CourseImportRequest } from "../schemas/course-import";
import type {
  CourseImportConfirmation,
  CourseImportConfirmationOutcome,
  CourseImportConfirmationRow,
  CourseImportPreviewRow,
  CourseImportSummary,
} from "../types/course-import";

const EXPECTED_OUTCOME_BY_STATUS: Partial<
  Record<CourseImportPreviewRow["status"], CourseImportConfirmationOutcome>
> = {
  INVALID: "INVALID",
  DUPLICATE_IN_FILE: "DUPLICATE_IN_FILE",
  DUPLICATE_EXISTING: "DUPLICATE_EXISTING",
  UNKNOWN_PROGRAM: "UNKNOWN_PROGRAM",
  INACTIVE_PROGRAM: "INACTIVE_PROGRAM",
  UNKNOWN_MAJOR: "UNKNOWN_MAJOR",
  INACTIVE_MAJOR: "INACTIVE_MAJOR",
  MAJOR_PROGRAM_MISMATCH: "MAJOR_PROGRAM_MISMATCH",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
};

function messageForOutcome(outcome: CourseImportConfirmationOutcome): string | null {
  if (outcome === "UNEXPECTED_FAILURE") {
    return "This Course could not be created. Try again or contact support.";
  }
  if (outcome === "UNPROCESSED") {
    return "This Course was not processed because an earlier row failed unexpectedly.";
  }
  return null;
}

function outcomeForPreviewRow(row: CourseImportPreviewRow): CourseImportConfirmationOutcome {
  return EXPECTED_OUTCOME_BY_STATUS[row.status] ?? "INVALID";
}

function summaryForConfirmation(rows: CourseImportConfirmationRow[]): CourseImportSummary {
  const created = rows.filter((row) => row.outcome === "CREATED").length;
  const notProcessed = rows.filter((row) => row.outcome === "UNPROCESSED").length;
  const notCreated = rows.length - created - notProcessed;

  return {
    total: rows.length,
    ready: 0,
    attention: notCreated,
    created,
    notCreated,
    notProcessed,
  };
}

function confirmationRow(
  row: CourseImportPreviewRow,
  outcome: CourseImportConfirmationOutcome,
  error: string | null = row.error
): CourseImportConfirmationRow {
  return { ...row, outcome, error: error ?? messageForOutcome(outcome) };
}

function baseCreateInput(
  row: CourseImportPreviewRow,
  programId: string | undefined,
  majorId: string | undefined
) {
  return {
    code: row.courseCode,
    title: row.courseTitle,
    course_scope: row.courseScope ?? CourseScope.PROGRAM_SPECIFIC,
    program_id: programId,
    major_id: majorId,
    default_year_level: row.yearLevel ?? undefined,
    default_semester: row.semester ?? undefined,
    default_term: row.term ?? undefined,
  };
}

async function resolveSecretaryRelationships(row: CourseImportPreviewRow) {
  if (row.courseScope !== CourseScope.PROGRAM_SPECIFIC || !row.programCode) {
    return { programId: undefined, majorId: undefined };
  }

  const program = await prisma.program.findFirst({
    where: { code: row.programCode, is_active: true },
    select: { id: true },
  });
  if (!program) return null;

  if (!row.majorName) return { programId: program.id, majorId: undefined };

  const major = await prisma.major.findFirst({
    where: { program_id: program.id, name: row.majorName, is_active: true },
    select: { id: true },
  });
  if (!major) return null;

  return { programId: program.id, majorId: major.id };
}

async function createImportedCourse(
  request: CourseImportRequest,
  row: CourseImportPreviewRow
): Promise<ServiceResult<{ id: string }>> {
  if (request.mode === "general-education") {
    return createGenEdCourse({
      ...baseCreateInput(row, undefined, undefined),
      course_scope: CourseScope.GENERAL_EDUCATION,
      program_id: undefined,
      major_id: undefined,
    });
  }

  if (request.mode === "program-head") {
    const majorId = row.majorName
      ? (
          await prisma.major.findFirst({
            where: {
              program_id: request.selectedProgramId,
              name: row.majorName,
              is_active: true,
            },
            select: { id: true },
          })
        )?.id
      : undefined;

    if (row.majorName && !majorId) {
      return { success: false, error: "The selected Major is no longer active." };
    }

    return createProgramHeadCourse({
      programId: request.selectedProgramId ?? "",
      course_type: row.courseType === "MAJOR_SPECIFIC" ? "major-specific" : "program-wide",
      code: row.courseCode,
      title: row.courseTitle,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      major_id: majorId,
      default_year_level: row.yearLevel ?? undefined,
      default_semester: row.semester ?? undefined,
      default_term: row.term ?? undefined,
    });
  }

  const relationships = await resolveSecretaryRelationships(row);
  if (!relationships) {
    return { success: false, error: "The Program or Major is no longer active." };
  }

  return createCourse({
    ...baseCreateInput(row, relationships.programId, relationships.majorId),
    program_id: relationships.programId,
    major_id: relationships.majorId,
  });
}

function expectedFailureOutcome(error: string): CourseImportConfirmationOutcome {
  if (error.includes("already exists")) return "DUPLICATE_EXISTING";
  if (error.includes("Program") || error.includes("program")) return "UNKNOWN_PROGRAM";
  if (error.includes("Major") || error.includes("major")) return "UNKNOWN_MAJOR";
  return "INVALID";
}

export async function confirmCourseImport(
  request: CourseImportRequest
): Promise<ServiceResult<CourseImportConfirmation>> {
  const previewResult = await previewCourseImport(request);
  if (!previewResult.success) return previewResult;

  const confirmationRows: CourseImportConfirmationRow[] = [];
  let stopped = false;

  for (const row of previewResult.data.rows) {
    if (stopped) {
      confirmationRows.push(confirmationRow(row, "UNPROCESSED"));
      continue;
    }

    if (row.status !== "READY") {
      confirmationRows.push(confirmationRow(row, outcomeForPreviewRow(row)));
      continue;
    }

    try {
      const result = await createImportedCourse(request, row);
      if (result.success) {
        confirmationRows.push(confirmationRow(row, "CREATED", null));
        continue;
      }

      confirmationRows.push(
        confirmationRow(row, expectedFailureOutcome(result.error), result.error)
      );
    } catch {
      confirmationRows.push(confirmationRow(row, "UNEXPECTED_FAILURE"));
      stopped = true;
    }
  }

  return {
    success: true,
    data: {
      rows: confirmationRows,
      summary: summaryForConfirmation(confirmationRows),
    },
  };
}
