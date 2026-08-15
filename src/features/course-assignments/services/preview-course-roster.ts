import { randomUUID } from "node:crypto";

import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

import type { PreviewCourseRosterInput } from "../schemas/course-assignment";
import type {
  CourseRosterPreview,
  CourseRosterPreviewCandidate,
  CourseRosterPreviewDisposition,
  CourseRosterPreviewResolution,
  CourseRosterPreviewRow,
  RosterEligibilityProjection,
  RosterServiceResult,
} from "../types";
import {
  projectRosterEligibility,
  resolveAuthorizedCourseAssignmentRoster,
  rosterStudentProfileSelect,
  type RosterEligibilityStudent,
} from "./course-assignment-roster";
import { matchRosterName, type RosterNameCandidate, type RosterNameMatchReason } from "./course-roster-name-match";

const SAFE_FAILURE_ERROR = "The roster preview could not be completed.";

type BatchStudent = RosterEligibilityStudent & { id: string; name: string; email: string };

function previewFailure(
  operation: string,
  actorId: string | undefined,
  assignmentId: string,
  error: unknown
): RosterServiceResult<CourseRosterPreview> {
  const referenceId = randomUUID();
  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          code:
            typeof error === "object" && error !== null && "code" in error
              ? String(error.code)
              : undefined,
        }
      : { type: typeof error };
  console.error("Course roster preview failed", {
    operation,
    actorId: actorId ?? null,
    assignmentId,
    referenceId,
    error: errorDetails,
  });
  return { success: false, error: SAFE_FAILURE_ERROR, referenceId };
}

/**
 * Preview how uploaded source names resolve against assignment-scoped
 * Students without mutating any membership. The assignment is authorized
 * once; candidates, memberships, and section conflicts load in one batched
 * Student read plus two membership reads. All classification is in memory.
 */
export async function previewCourseRoster(
  input: PreviewCourseRosterInput
): Promise<RosterServiceResult<CourseRosterPreview>> {
  let actorId: string | undefined;

  try {
    const session = await resolveAuthSession();
    if (!session) {
      return { success: false, error: "Authentication required." };
    }
    actorId = session.userId;

    const authorization = await resolveAuthorizedCourseAssignmentRoster(input.assignmentId, {
      manage: true,
      programId: input.programId,
    });
    if (!authorization.success) {
      return authorization;
    }
    const assignment = authorization.data;

    const students = await prisma.user.findMany({
      where: {
        roles: { some: { role: ROLES.STUDENT } },
        is_active: true,
        student_profile: { isNot: null },
        enrollments: {
          some: { term_instance_id: assignment.termInstanceId, is_active: true },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: { select: { role: true } },
        is_active: true,
        student_profile: { select: rosterStudentProfileSelect },
        enrollments: {
          where: { term_instance_id: assignment.termInstanceId, is_active: true },
          select: { program_id: true },
        },
      },
    });

    const studentIds = students.map((student) => student.id);
    const [memberships, conflicts] = await Promise.all([
      prisma.courseAssignmentMembership.findMany({
        where: { course_assignment_id: assignment.assignmentId, student_user_id: { in: studentIds } },
        select: { student_user_id: true, is_active: true, removed_at: true },
      }),
      prisma.courseAssignmentMembership.findMany({
        where: {
          student_user_id: { in: studentIds },
          course_id: assignment.courseId,
          term_instance_id: assignment.termInstanceId,
          program_id: assignment.programId,
          course_assignment_id: { not: assignment.assignmentId },
          is_active: true,
        },
        select: { student_user_id: true },
      }),
    ]);

    const membershipByStudentId = new Map(
      memberships.map((membership) => [membership.student_user_id, membership])
    );
    const conflictingStudentIds = new Set(conflicts.map((conflict) => conflict.student_user_id));

    const selectable: BatchStudent[] = [];
    const diagnostics: BatchStudent[] = [];
    const projectionByStudentId = new Map<string, RosterEligibilityProjection>();
    for (const student of students) {
      const projection = projectRosterEligibility(
        { courseScope: assignment.courseScope, programId: assignment.programId },
        student
      );
      projectionByStudentId.set(student.id, projection);
      if (projection.eligible) {
        selectable.push(student);
      } else {
        diagnostics.push(student);
      }
    }

    const selectableCandidates: RosterNameCandidate[] = selectable.map((student) => ({
      id: student.id,
      name: student.name,
    }));
    const diagnosticCandidates: RosterNameCandidate[] = diagnostics.map((student) => ({
      id: student.id,
      name: student.name,
    }));

    const studentById = new Map(
      students.map((student) => [student.id, student])
    );

    function selectableAndDiagnosticById(studentIds: string[]): CourseRosterPreviewCandidate[] {
      return studentIds.map((studentId) => {
        const student = studentById.get(studentId);
        if (!student) {
          // matchedIds always derive from the batch, so this is unreachable;
          // fail loudly instead of fabricating a candidate.
          throw new Error(`Preview candidate ${studentId} not in the batch.`);
        }
        const projection = projectionByStudentId.get(studentId) ?? {
          eligible: false,
          reason: null,
        };
        return {
          userId: student.id,
          name: student.name,
          email: student.email,
          programId: student.student_profile?.program_id ?? "",
          selectable: projection.eligible,
          reason: projection.eligible ? null : projection.reason,
        };
      });
    }

    function dispositionFor(studentId: string): CourseRosterPreviewDisposition {
      const membership = membershipByStudentId.get(studentId);
      if (membership?.is_active) {
        return "ALREADY_ACTIVE";
      }
      // Confirmation rejects a restore when the Student is already active in
      // another section of the same Course and Academic Period, so the
      // conflict must be reported ahead of any restorable membership.
      if (conflictingStudentIds.has(studentId)) {
        return "OTHER_SECTION_CONFLICT";
      }
      if (membership && !membership.is_active && membership.removed_at) {
        return "WILL_RESTORE";
      }
      return "READY_CREATE";
    }

    function toResolution(
      match: ReturnType<typeof matchRosterName>
    ): CourseRosterPreviewResolution {
      switch (match.status) {
        case "EXACT_MATCH":
          return { status: "EXACT_MATCH", reason: "EXACT", candidateIds: match.matchedIds };
        case "SUGGESTED_MATCH":
          return {
            status: "SUGGESTED_MATCH",
            reason: suggestionReason(match.reason),
            candidateIds: match.matchedIds,
          };
        case "AMBIGUOUS":
          return { status: "AMBIGUOUS", reason: "EQUAL_TIER", candidateIds: match.matchedIds };
        case "NO_MATCH":
          return { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] };
      }
    }

    function suggestionReason(
      reason: RosterNameMatchReason
    ): Extract<CourseRosterPreviewResolution, { status: "SUGGESTED_MATCH" }>["reason"] {
      switch (reason) {
        case "MIDDLE_TOKEN":
        case "INITIAL":
        case "SEPARATOR_PUNCTUATION":
        case "SUFFIX":
        case "DIACRITIC":
          return reason;
        default:
          throw new Error(`Unexpected suggestion reason ${reason}.`);
      }
    }

    const rows: CourseRosterPreviewRow[] = input.rows.map((row) => {
      if (row.status === "INVALID_NAME") {
        return {
          sourceIndex: row.sourceIndex,
          submittedName: row.submittedName,
          resolution: { status: "INVALID_NAME" as const, reason: "INVALID" as const, candidateIds: [] },
          disposition: null,
          candidates: [] as CourseRosterPreviewCandidate[],
        };
      }

      const match = matchRosterName(row.submittedName, selectableCandidates);
      if (match.status === "NO_MATCH") {
        const diagnosticMatch = matchRosterName(row.submittedName, diagnosticCandidates);
        const diagnosticsForRow =
          diagnosticMatch.status === "EXACT_MATCH" || diagnosticMatch.status === "SUGGESTED_MATCH"
            ? selectableAndDiagnosticById(diagnosticMatch.matchedIds)
            : [];
        return {
          sourceIndex: row.sourceIndex,
          submittedName: row.submittedName,
          resolution: {
            status: "NO_MATCH" as const,
            reason: "NO_EVIDENCE" as const,
            candidateIds: [],
          },
          disposition: null,
          candidates: diagnosticsForRow,
        };
      }

      const resolution = toResolution(match);
      const candidateId = match.matchedIds[0];
      const disposition: CourseRosterPreviewDisposition | null =
        match.status === "AMBIGUOUS" ? null : dispositionFor(candidateId);

      const candidates = selectableAndDiagnosticById(match.matchedIds);
      return {
        sourceIndex: row.sourceIndex,
        submittedName: row.submittedName,
        resolution,
        disposition,
        candidates,
      };
    });

    const summary = {
      readyToCreate: rows.filter((row) => row.disposition === "READY_CREATE").length,
      willRestore: rows.filter((row) => row.disposition === "WILL_RESTORE").length,
      alreadyActive: rows.filter((row) => row.disposition === "ALREADY_ACTIVE").length,
      needsReview: rows.filter(
        (row) =>
          row.resolution.status === "SUGGESTED_MATCH" ||
          row.resolution.status === "AMBIGUOUS" ||
          row.resolution.status === "NO_MATCH" ||
          row.resolution.status === "INVALID_NAME"
      ).length,
      ineligible: rows.filter(
        (row) =>
          row.disposition === "INELIGIBLE" || row.disposition === "OTHER_SECTION_CONFLICT"
      ).length,
    };

    return { success: true, data: { assignmentId: assignment.assignmentId, rows, summary } };

  } catch (error) {
    return previewFailure("preview_course_roster", actorId, input.assignmentId, error);
  }
}
