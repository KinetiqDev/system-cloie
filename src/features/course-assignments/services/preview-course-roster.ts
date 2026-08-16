import { randomUUID } from "node:crypto";
import { CourseScope } from "@prisma/client";

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
  ScopedRosterCandidate,
} from "../types";
import { matchRosterName, type RosterNameCandidate, type RosterNameMatch } from "./course-roster-name-match";
import { loadScopedRosterCandidates } from "./course-roster-candidate-scope";
import { normalizeRosterName } from "./course-roster-csv";

const SAFE_FAILURE_ERROR = "The roster preview could not be completed.";

type ExistingMemberStudent = {
  id: string;
  name: string;
  email: string;
  student_profile: {
    program_id: string | null;
    program: { code: string; name: string } | null;
    major: { name: string } | null;
  } | null;
  enrollments: Array<{
    program_id: string;
    year_level: string | null;
    section: string | null;
    program: { code: string; name: string } | null;
    major: { name: string } | null;
  }>;
};

type AssignmentScope = {
  courseScope: CourseScope;
  programId: string;
};

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

function isProgramMismatchedMember(assignment: AssignmentScope, student: ExistingMemberStudent) {
  if (assignment.courseScope !== CourseScope.PROGRAM_SPECIFIC) return false;
  const profileProgramId = student.student_profile?.program_id;
  const placementProgramId = student.enrollments[0]?.program_id;
  if (profileProgramId && profileProgramId !== assignment.programId) return true;
  if (placementProgramId && placementProgramId !== assignment.programId) return true;
  return false;
}

function toExistingMemberCandidate(student: ExistingMemberStudent): CourseRosterPreviewCandidate {
  const placement = student.enrollments[0] ?? {
    program_id: "",
    year_level: null,
    section: null,
    program: null,
    major: null,
  };
  const profile = student.student_profile ?? {
    program_id: "",
    program: null,
    major: null,
  };
  const program = placement.program ?? profile.program;
  const major = placement.major ?? profile.major;
  return {
    userId: student.id,
    name: student.name,
    email: student.email,
    programId: profile.program_id ?? "",
    programCode: program ? program.code : null,
    programName: program ? program.name : null,
    yearLevel: placement.year_level,
    section: placement.section,
    majorName: major ? major.name : null,
    selectable: false,
    reason: null,
  };
}

function toNameCandidate(candidate: { userId: string; name: string }): RosterNameCandidate {
  return { id: candidate.userId, name: candidate.name };
}

function matchStrength(status: RosterNameMatch["status"]) {
  if (status === "EXACT_MATCH") return 2;
  if (status === "SUGGESTED_MATCH") return 1;
  return 0;
}

function toResolution(match: RosterNameMatch): CourseRosterPreviewResolution {
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

function emptyPreviewCandidate(studentId: string): CourseRosterPreviewCandidate {
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

function previewRow(
  sourceIndex: number,
  submittedName: string,
  resolution: CourseRosterPreviewResolution,
  disposition: CourseRosterPreviewDisposition | null,
  candidates: CourseRosterPreviewCandidate[]
): CourseRosterPreviewRow {
  return { sourceIndex, submittedName, resolution, disposition, candidates };
}

function compareUniqueMatches(existingMatch: RosterNameMatch, selectableMatch: RosterNameMatch) {
  if (existingMatch.matchedIds[0] === selectableMatch.matchedIds[0]) return existingMatch;
  if (matchStrength(existingMatch.status) !== matchStrength(selectableMatch.status)) {
    return matchStrength(selectableMatch.status) > matchStrength(existingMatch.status)
      ? selectableMatch
      : existingMatch;
  }
  return {
    status: "AMBIGUOUS" as const,
    reason: "EQUAL_TIER" as const,
    matchedIds: [...new Set([...existingMatch.matchedIds, ...selectableMatch.matchedIds])],
  };
}

function chooseIdentityMatch(existingMatch: RosterNameMatch, selectableMatch: RosterNameMatch) {
  if (matchStrength(existingMatch.status) > 0 && matchStrength(selectableMatch.status) > 0) {
    return compareUniqueMatches(existingMatch, selectableMatch);
  }
  if (matchStrength(selectableMatch.status) === 2) return selectableMatch;
  // Multiple equal-tier eligible matches must be resolved by the manager; a
  // single suggested existing member does not override that ambiguity. Only an
  // exact existing-member match remains decisive over eligible ambiguity.
  if (selectableMatch.status === "AMBIGUOUS" && matchStrength(existingMatch.status) < 2) {
    return {
      status: "AMBIGUOUS" as const,
      reason: "EQUAL_TIER" as const,
      matchedIds: [...new Set([...selectableMatch.matchedIds, ...existingMatch.matchedIds])],
    };
  }
  if (existingMatch.status !== "NO_MATCH") return existingMatch;
  return selectableMatch;
}

function reserveResolvedIdentities(rows: CourseRosterPreviewRow[]): CourseRosterPreviewRow[] {
  const reserved = new Set<string>();
  const claim = (row: CourseRosterPreviewRow): CourseRosterPreviewRow => {
    const candidateId = row.resolution.candidateIds[0];
    if (!candidateId) return row;
    if (reserved.has(candidateId)) {
      return previewRow(
        row.sourceIndex,
        row.submittedName,
        { status: "DUPLICATE_MATCH", reason: "DUPLICATE_IDENTITY", candidateIds: [candidateId] },
        null,
        row.candidates
      );
    }
    reserved.add(candidateId);
    return row;
  };

  const withExactClaims = rows.map((row) =>
    row.resolution.status === "EXACT_MATCH" ? claim(row) : row
  );
  return withExactClaims.map((row) =>
    row.resolution.status === "SUGGESTED_MATCH" ? claim(row) : row
  );
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
        where: {
          course_assignment_id: assignment.assignmentId,
          ...(assignment.courseScope === CourseScope.PROGRAM_SPECIFIC
            ? {
                student: {
                  OR: [
                    { student_profile: { is: { program_id: assignment.programId } } },
                    {
                      enrollments: {
                        some: {
                          term_instance_id: assignment.termInstanceId,
                          is_active: true,
                          program_id: assignment.programId,
                        },
                      },
                    },
                  ],
                },
              }
            : {}),
        },
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
    const existingMemberCandidates = memberships
      .filter((membership) => !isProgramMismatchedMember(assignment, membership.student))
      .map((membership) => toExistingMemberCandidate(membership.student));
    const candidatesByStudentId = new Map<string, CourseRosterPreviewCandidate | ScopedRosterCandidate>(
      [...candidates, ...existingMemberCandidates].map((candidate) => [candidate.userId, candidate])
    );
    const selectable = candidates.filter((candidate) => candidate.selectable);
    const diagnostics = candidates.filter((candidate) => !candidate.selectable);
    const existingMemberNameCandidates = existingMemberCandidates.map(toNameCandidate);
    const conflictingStudentIds = new Set(conflicts.map((conflict) => conflict.student_user_id));
    const selectableCandidates = selectable.map(toNameCandidate);
    const diagnosticCandidates = diagnostics.map(toNameCandidate);

    const classifiedRows = input.rows.map((row) => classifyPreviewRow(row));
    const rows = reserveResolvedIdentities(classifiedRows);

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
      if (!student) return emptyPreviewCandidate(studentId);
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

    function classifyPreviewRow(row: PreviewCourseRosterInput["rows"][number]): CourseRosterPreviewRow {
      const normalizedName = normalizeRosterName(row.submittedName);
      if (
        row.status === "INVALID_NAME" ||
        normalizedName.length === 0 ||
        normalizedName.length > 200
      ) {
        return previewRow(
          row.sourceIndex,
          row.submittedName,
          { status: "INVALID_NAME", reason: "INVALID", candidateIds: [] },
          null,
          []
        );
      }

      const chosen = chooseIdentityMatch(
        matchRosterName(row.submittedName, existingMemberNameCandidates),
        matchRosterName(row.submittedName, selectableCandidates)
      );
      if (chosen.status === "NO_MATCH") {
        const diagnosticMatch = matchRosterName(row.submittedName, diagnosticCandidates);
        const diagnosticsForRow =
          matchStrength(diagnosticMatch.status) > 0
            ? diagnosticMatch.matchedIds.map((id) => toPreviewCandidate(id))
            : [];
        return previewRow(
          row.sourceIndex,
          row.submittedName,
          { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
          null,
          diagnosticsForRow
        );
      }
      if (chosen.status === "AMBIGUOUS") {
        return previewRow(
          row.sourceIndex,
          row.submittedName,
          toResolution(chosen),
          null,
          chosen.matchedIds.map((id) => toPreviewCandidate(id))
        );
      }

      const candidateId = chosen.matchedIds[0];
      return previewRow(
        row.sourceIndex,
        row.submittedName,
        toResolution(chosen),
        dispositionFor(candidateId),
        [toPreviewCandidate(candidateId)]
      );
    }
  } catch (error) {
    return previewFailure("preview_course_roster", actorId, input.assignmentId, error);
  }
}
