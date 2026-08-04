import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

import {
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  type RosterEligibilityStudent,
} from "./course-assignment-roster";
import { addRosterMembership } from "./manage-course-roster";
import {
  isRosterEmail,
  parseCourseRosterCsv,
  type CourseRosterCsvRow,
} from "./course-roster-csv";
import type {
  CourseRosterImportRow,
  CourseRosterImportRowStatus,
  CourseRosterImportSummary,
  RosterServiceResult,
} from "../types";

const SAFE_FAILURE_ERROR = "The roster request could not be completed.";

const errorStatuses: Record<string, CourseRosterImportRowStatus> = {
  "No matching account was found.": "UNKNOWN_ACCOUNT",
  "Account is not a Student account.": "NON_STUDENT_ACCOUNT",
  "Student account is inactive.": "ACCOUNT_INACTIVE",
  "Student profile is incomplete.": "PROFILE_INCOMPLETE",
  "Student has no active term placement for this Academic Period.": "NO_ACTIVE_TERM_PLACEMENT",
  "Student does not match this Course assignment program.": "PROGRAM_MISMATCH",
  "Student is already an active member of this Course roster.": "ALREADY_ACTIVE",
  "Student is already active in another section for this Course and Academic Period.":
    "OTHER_SECTION_CONFLICT",
  "This Course roster is read-only.": "READ_ONLY",
  "This Course assignment is inactive. The roster is read-only.": "READ_ONLY",
  "This Academic Period is no longer active. The roster is read-only.": "READ_ONLY",
  "A Course-bound evaluation has been published for this assignment. The roster is locked.": "READ_ONLY",
  "Course assignment not found.": "READ_ONLY",
};

const errorMessages: Record<CourseRosterImportRowStatus, string> = {
  CREATED: "Student added to Course roster.",
  RESTORED: "Student membership restored.",
  DUPLICATE_EMAIL: "Duplicate email in this upload.",
  MALFORMED_EMAIL: "Enter a valid email address.",
  UNKNOWN_ACCOUNT: "No matching account was found.",
  NON_STUDENT_ACCOUNT: "Account is not a Student account.",
  ACCOUNT_INACTIVE: "Student account is inactive.",
  PROFILE_INCOMPLETE: "Student profile is incomplete.",
  NO_ACTIVE_TERM_PLACEMENT: "Student has no active term placement for this Academic Period.",
  PROGRAM_MISMATCH: "Student does not match this Course assignment program.",
  ALREADY_ACTIVE: "Student is already an active member of this Course roster.",
  OTHER_SECTION_CONFLICT:
    "Student is already active in another section for this Course and Academic Period.",
  READ_ONLY: "This Course roster is read-only.",
  UNEXPECTED_FAILURE: SAFE_FAILURE_ERROR,
  UNPROCESSED: "This row was not processed because import stopped unexpectedly.",
};

type BatchStudent = {
  id: string;
  email: string;
  is_active: boolean;
  roles: Array<{ role: RosterEligibilityStudent["roles"][number]["role"] }>;
  student_profile: RosterEligibilityStudent["student_profile"];
  enrollments: RosterEligibilityStudent["enrollments"];
};

type BatchContext = {
  students: Map<string, BatchStudent>;
  memberships: Map<string, boolean>;
  sectionConflicts: Set<string>;
};

function rowResult(
  row: CourseRosterCsvRow,
  status: CourseRosterImportRowStatus,
  error = errorMessages[status]
): CourseRosterImportRow {
  return { sourceIndex: row.sourceIndex, email: row.submittedEmail, status, error };
}

function unexpectedReference() {
  return randomUUID();
}

function unexpectedImportFailure(
  actorId: string,
  assignmentId: string,
  rowIndex: number,
  referenceId: string
) {
  console.error("Course roster import stopped unexpectedly", {
    operation: "import_course_roster",
    actorId,
    assignmentId,
    rowIndex,
    referenceId,
  });
}

async function readBatch(
  assignmentId: string,
  termInstanceId: string,
  courseId: string,
  programId: string,
  emails: string[]
): Promise<BatchContext> {
  const students = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      email: true,
      is_active: true,
      roles: { select: { role: true } },
      student_profile: { select: { program_id: true, student_id_number: true } },
      enrollments: {
        where: { term_instance_id: termInstanceId, is_active: true },
        select: { program_id: true },
      },
    },
  });
  const studentIds = students.map((student) => student.id);
  if (studentIds.length === 0) {
    return { students: new Map(), memberships: new Map(), sectionConflicts: new Set() };
  }

  const [memberships, conflicts] = await Promise.all([
    prisma.courseAssignmentMembership.findMany({
      where: { course_assignment_id: assignmentId, student_user_id: { in: studentIds } },
      select: { student_user_id: true, is_active: true },
    }),
    prisma.courseAssignmentMembership.findMany({
      where: {
        student_user_id: { in: studentIds },
        course_id: courseId,
        term_instance_id: termInstanceId,
        program_id: programId,
        course_assignment_id: { not: assignmentId },
        is_active: true,
      },
      select: { student_user_id: true },
    }),
  ]);

  return {
    students: new Map(students.map((student) => [student.email.toLowerCase(), student])),
    memberships: new Map(memberships.map((membership) => [membership.student_user_id, membership.is_active])),
    sectionConflicts: new Set(conflicts.map((conflict) => conflict.student_user_id)),
  };
}

function mapServiceFailure(error: string) {
  return errorStatuses[error];
}

function summarize(rows: CourseRosterImportRow[], referenceId?: string): CourseRosterImportSummary {
  return {
    total: rows.length,
    created: rows.filter((row) => row.status === "CREATED").length,
    restored: rows.filter((row) => row.status === "RESTORED").length,
    failed: rows.filter((row) => !["CREATED", "RESTORED", "UNPROCESSED"].includes(row.status)).length,
    unprocessed: rows.filter((row) => row.status === "UNPROCESSED").length,
    rows,
    ...(referenceId ? { referenceId } : {}),
  };
}

export async function importCourseRoster(
  assignmentId: string,
  input: string | Uint8Array,
  programId?: string
): Promise<RosterServiceResult<CourseRosterImportSummary>> {
  const parsed = parseCourseRosterCsv(input);
  if (!parsed.success) return { success: false, error: parsed.error };

  let actorId: string | undefined;
  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    if (session.activeRole === ROLES.PROGRAM_HEAD && !programId) {
      return { success: false, error: "Course assignment not found." };
    }

    const authorization = await resolveAuthorizedCourseAssignmentRoster(assignmentId, {
      manage: true,
      programId,
    });
    if (!authorization.success) return authorization;
    if (!authorization.data.canManage) return { success: false, error: "Course assignment not found." };
    if (!authorization.data.canMutate) {
      return { success: false, error: "This Course roster is read-only." };
    }

    const uniqueEmails = [...new Set(parsed.rows.filter((row) => isRosterEmail(row.normalizedEmail)).map((row) => row.normalizedEmail))];
    let batch: BatchContext;
    try {
      batch = await readBatch(
        assignmentId,
        authorization.data.termInstanceId,
        authorization.data.courseId,
        authorization.data.programId,
        uniqueEmails
      );
    } catch (error) {
      const referenceId = unexpectedReference();
      unexpectedImportFailure(actorId, assignmentId, parsed.rows[0].sourceIndex, referenceId);
      console.error("Course roster import batch read failed", {
        operation: "import_course_roster_batch",
        actorId,
        assignmentId,
        referenceId,
        error:
          error instanceof Error
            ? { name: error.name, code: "code" in error ? String(error.code) : undefined }
            : { type: typeof error },
      });
      const results = [
        rowResult(parsed.rows[0], "UNEXPECTED_FAILURE", `${SAFE_FAILURE_ERROR} Support reference: ${referenceId}.`),
        ...parsed.rows.slice(1).map((row) =>
          rowResult(row, "UNPROCESSED", `${errorMessages.UNPROCESSED} Support reference: ${referenceId}.`)
        ),
      ];
      return { success: true, data: summarize(results, referenceId) };
    }
    const seen = new Set<string>();
    const results: CourseRosterImportRow[] = [];

    // ponytail: sequential writes stay bounded at 500 rows; add concurrency only after measured latency requires it.
    for (const row of parsed.rows) {
      if (!isRosterEmail(row.normalizedEmail)) {
        results.push(rowResult(row, "MALFORMED_EMAIL"));
        continue;
      }
      if (seen.has(row.normalizedEmail)) {
        results.push(rowResult(row, "DUPLICATE_EMAIL"));
        continue;
      }
      seen.add(row.normalizedEmail);

      const student = batch.students.get(row.normalizedEmail);
      if (!student) {
        results.push(rowResult(row, "UNKNOWN_ACCOUNT"));
        continue;
      }
      const membershipIsActive = batch.memberships.get(student.id);
      if (membershipIsActive) {
        results.push(rowResult(row, "ALREADY_ACTIVE"));
        continue;
      }
      if (batch.sectionConflicts.has(student.id)) {
        results.push(rowResult(row, "OTHER_SECTION_CONFLICT"));
        continue;
      }

      const projection = projectRosterEligibility(authorization.data, student);
      if (!projection.eligible) {
        const status = projection.reason;
        results.push(rowResult(row, status ?? "UNKNOWN_ACCOUNT"));
        continue;
      }

      const write = programId
        ? await addRosterMembership(assignmentId, row.normalizedEmail, programId)
        : await addRosterMembership(assignmentId, row.normalizedEmail);
      if (write.success) {
        const status = write.data.outcome === "CREATED" ? "CREATED" : "RESTORED";
        results.push(rowResult(row, status, write.data.message));
        continue;
      }
      const status = mapServiceFailure(write.error);
      if (status) {
        results.push(rowResult(row, status));
        continue;
      }

      const referenceId = write.referenceId ?? unexpectedReference();
      unexpectedImportFailure(actorId, assignmentId, row.sourceIndex, referenceId);
      results.push(rowResult(row, "UNEXPECTED_FAILURE", `${SAFE_FAILURE_ERROR} Support reference: ${referenceId}.`));
      for (const remaining of parsed.rows.slice(results.length)) {
        results.push(rowResult(remaining, "UNPROCESSED", `${errorMessages.UNPROCESSED} Support reference: ${referenceId}.`));
      }
      return { success: true, data: summarize(results, referenceId) };
    }

    return { success: true, data: summarize(results) };
  } catch (error) {
    const referenceId = unexpectedReference();
    console.error("Course roster import failed", {
      operation: "import_course_roster_batch",
      actorId: actorId ?? null,
      assignmentId,
      referenceId,
      error: error instanceof Error ? { name: error.name, code: "code" in error ? String(error.code) : undefined } : { type: typeof error },
    });
    return { success: false, error: SAFE_FAILURE_ERROR, referenceId };
  }
}
