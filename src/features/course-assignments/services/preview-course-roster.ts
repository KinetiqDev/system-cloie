import { randomUUID } from "node:crypto";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";

import type { PreviewCourseRosterInput } from "../schemas/course-assignment";
import type {
  CourseRosterPreview,
  CourseRosterPreviewCandidate,
  CourseRosterPreviewDisposition,
  CourseRosterPreviewResolution,
  CourseRosterPreviewRow,
  RosterServiceResult,
} from "../types";
import { matchRosterName, type RosterNameCandidate } from "./course-roster-name-match";
import { loadScopedRosterCandidates } from "./course-roster-candidate-scope";

const SAFE_FAILURE_ERROR = "The roster preview could not be completed.";

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

    const scoped = await loadScopedRosterCandidates(input.assignmentId, input.programId);
    if (!scoped.success) return scoped;
    const { assignment, candidates } = scoped.data;
    const selectable = candidates.filter((candidate) => candidate.selectable);
    const diagnostics = candidates.filter((candidate) => !candidate.selectable);
    const studentIds = candidates.map((candidate) => candidate.userId);
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

    const selectableCandidates: RosterNameCandidate[] = selectable.map((student) => ({
      id: student.userId,
      name: student.name,
    }));
    const diagnosticCandidates: RosterNameCandidate[] = diagnostics.map((student) => ({
      id: student.userId,
      name: student.name,
    }));

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
            ? diagnosticMatch.matchedIds.map((id) => toPreviewCandidate(id))
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

      return {
        sourceIndex: row.sourceIndex,
        submittedName: row.submittedName,
        resolution,
        disposition,
        candidates:
          match.status === "AMBIGUOUS"
            ? match.matchedIds.map((id) => toPreviewCandidate(id))
            : [toPreviewCandidate(candidateId)],
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

    function toPreviewCandidate(studentId: string): CourseRosterPreviewCandidate {
      const student = candidates.find((candidate) => candidate.userId === studentId);
      if (!student) {
        return { userId: studentId, name: "", email: "", programId: "", selectable: false, reason: null };
      }
      return {
        userId: student.userId,
        name: student.name,
        email: student.email,
        programId: student.programId,
        selectable: student.selectable,
        reason: student.reason,
      };
    }

    function dispositionFor(studentId: string): CourseRosterPreviewDisposition {
      const membership = membershipByStudentId.get(studentId);
      if (membership?.is_active) return "ALREADY_ACTIVE";
      if (conflictingStudentIds.has(studentId)) return "OTHER_SECTION_CONFLICT";
      if (membership && !membership.is_active && membership.removed_at) return "WILL_RESTORE";
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
            reason: match.reason as Extract<CourseRosterPreviewResolution, { status: "SUGGESTED_MATCH" }>["reason"],
            candidateIds: match.matchedIds,
          };
        case "AMBIGUOUS":
          return { status: "AMBIGUOUS", reason: "EQUAL_TIER", candidateIds: match.matchedIds };
        case "NO_MATCH":
          return { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] };
      }
    }
  } catch (error) {
    return previewFailure("preview_course_roster", actorId, input.assignmentId, error);
  }
}
