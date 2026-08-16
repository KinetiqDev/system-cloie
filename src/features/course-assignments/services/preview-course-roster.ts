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
    const [memberships, conflicts] = await Promise.all([
      prisma.courseAssignmentMembership.findMany({
        where: { course_assignment_id: assignment.assignmentId },
        select: {
          student_user_id: true,
          is_active: true,
          removed_at: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              student_profile: {
                select: {
                  program_id: true,
                  program: { select: { code: true, name: true } },
                  major: { select: { name: true } },
                },
              },
              enrollments: {
                where: { term_instance_id: assignment.termInstanceId, is_active: true },
                select: {
                  program_id: true,
                  year_level: true,
                  section: true,
                  program: { select: { code: true, name: true } },
                  major: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.courseAssignmentMembership.findMany({
        where: {
          student_user_id: { in: candidates.map((candidate) => candidate.userId) },
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
    const existingMemberCandidates = memberships.map((membership) => ({
      userId: membership.student.id,
      name: membership.student.name,
      email: membership.student.email,
      programId: membership.student.student_profile?.program_id ?? "",
      programCode: membership.student.enrollments[0]?.program?.code ?? membership.student.student_profile?.program?.code ?? null,
      programName: membership.student.enrollments[0]?.program?.name ?? membership.student.student_profile?.program?.name ?? null,
      yearLevel: membership.student.enrollments[0]?.year_level ?? null,
      section: membership.student.enrollments[0]?.section ?? null,
      majorName: membership.student.enrollments[0]?.major?.name ?? membership.student.student_profile?.major?.name ?? null,
      selectable: false,
      reason: null,
    }));
    const candidatesByStudentId = new Map(
      [...candidates, ...existingMemberCandidates].map((candidate) => [candidate.userId, candidate])
    );
    const selectable = candidates.filter((candidate) => candidate.selectable);
    const diagnostics = candidates.filter((candidate) => !candidate.selectable);
    const existingMemberNameCandidates: RosterNameCandidate[] = existingMemberCandidates.map((candidate) => ({
      id: candidate.userId,
      name: candidate.name,
    }));
    const conflictingStudentIds = new Set(conflicts.map((conflict) => conflict.student_user_id));
    const selectableCandidates: RosterNameCandidate[] = selectable.map((student) => ({
      id: student.userId,
      name: student.name,
    }));
    const diagnosticCandidates: RosterNameCandidate[] = diagnostics.map((student) => ({
      id: student.userId,
      name: student.name,
    }));
    const resolvedStudentIds = new Set<string>();
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

      const existingMemberMatch = matchRosterName(row.submittedName, existingMemberNameCandidates);
      if (
        existingMemberMatch.status === "EXACT_MATCH" ||
        existingMemberMatch.status === "SUGGESTED_MATCH"
      ) {
        const candidateId = existingMemberMatch.matchedIds[0];
        if (resolvedStudentIds.has(candidateId)) {
          return {
            sourceIndex: row.sourceIndex,
            submittedName: row.submittedName,
            resolution: {
              status: "DUPLICATE_MATCH" as const,
              reason: "DUPLICATE_IDENTITY" as const,
              candidateIds: [candidateId],
            },
            disposition: null,
            candidates: [toPreviewCandidate(candidateId)],
          };
        }
        resolvedStudentIds.add(candidateId);
        return {
          sourceIndex: row.sourceIndex,
          submittedName: row.submittedName,
          resolution: toResolution(existingMemberMatch),
          disposition: dispositionFor(candidateId),
          candidates: [toPreviewCandidate(candidateId)],
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
      if (
        (match.status === "EXACT_MATCH" || match.status === "SUGGESTED_MATCH") &&
        resolvedStudentIds.has(candidateId)
      ) {
        return {
          sourceIndex: row.sourceIndex,
          submittedName: row.submittedName,
          resolution: {
            status: "DUPLICATE_MATCH" as const,
            reason: "DUPLICATE_IDENTITY" as const,
            candidateIds: [candidateId],
          },
          disposition: null,
          candidates: [toPreviewCandidate(candidateId)],
        };
      }
      if (match.status === "EXACT_MATCH" || match.status === "SUGGESTED_MATCH") {
        resolvedStudentIds.add(candidateId);
      }
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
          row.resolution.status === "DUPLICATE_MATCH" ||
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
      const student = candidatesByStudentId.get(studentId);
      if (!student) {
        return {
          userId: studentId,
          name: "",
          email: "",
          programId: "",
          programCode: null,
          programName: null,
          yearLevel: null,
          section: null,
          majorName: null,
          selectable: false,
          reason: null,
        };
      }
      return {
        userId: student.userId,
        name: student.name,
        email: student.email,
        programId: student.programId,
        programCode: student.programCode,
        programName: student.programName,
        yearLevel: student.yearLevel,
        section: student.section,
        majorName: student.majorName,
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
