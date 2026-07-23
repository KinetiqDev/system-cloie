import { randomUUID } from "node:crypto";
import {
  CourseScope,
  DeploymentStatus,
  Prisma,
  type CourseBoundEvaluationExclusionReversalCategory,
} from "@prisma/client";
import { canManageCourseRoster } from "@/features/course-assignments/policies";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import type {
  LateIncludeCourseBoundEvaluationInput,
  LateIncludeCourseBoundEvaluationResult,
} from "../types";
import { isNeutralOtherExplanation } from "../exclusion-text";

const NOT_FOUND_ERROR = "Course assignment not found.";
const OTHER_EXPLANATION_ERROR =
  "Other reversal explanations must be 5-200 neutral characters without sensitive details.";

class LateIncludeValidationError extends Error {}

function isTransactionWriteConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isClosedEvaluation(status: DeploymentStatus, deadlineAt: Date | null) {
  return (
    (status !== DeploymentStatus.ACTIVE && status !== DeploymentStatus.SCHEDULED) ||
    (deadlineAt !== null && deadlineAt.getTime() < Date.now())
  );
}

function validateReversalExplanation(
  category: CourseBoundEvaluationExclusionReversalCategory,
  explanation: string | undefined
) {
  const normalized = explanation?.trim() || undefined;
  if (category === "OTHER") {
    if (
      !normalized ||
      normalized.length < 5 ||
      normalized.length > 200 ||
      !isNeutralOtherExplanation(normalized)
    ) {
      throw new LateIncludeValidationError(OTHER_EXPLANATION_ERROR);
    }
    return normalized;
  }

  if (normalized) {
    throw new LateIncludeValidationError("Only an Other reversal may include an explanation.");
  }

  return null;
}

async function findAssignmentForAuthorization(db: Prisma.TransactionClient, evaluationId: string) {
  return db.courseBoundEvaluation.findUnique({
    where: { id: evaluationId },
    select: {
      id: true,
      status: true,
      deadline_at: true,
      course_assignment_id: true,
      course_assignment: {
        select: {
          faculty_id: true,
          is_active: true,
          program_id: true,
          course: { select: { course_scope: true } },
        },
      },
    },
  });
}

async function isAuthorizedRosterManager(
  db: Prisma.TransactionClient,
  session: NonNullable<Awaited<ReturnType<typeof resolveAuthSession>>>,
  assignment: {
    faculty_id: string;
    is_active: boolean;
    program_id: string;
    course: { course_scope: CourseScope };
  }
) {
  const programHeadProgramIds =
    session.activeRole === ROLES.PROGRAM_HEAD
      ? (
          await db.programHeadAssignment.findMany({
            where: { program_head_id: session.userId, is_active: true },
            select: { program_id: true },
          })
        ).map((row) => row.program_id)
      : [];

  return canManageCourseRoster(
    session,
    {
      facultyId: assignment.faculty_id,
      programId: assignment.program_id,
      courseScope: assignment.course.course_scope,
      isActive: assignment.is_active,
    },
    programHeadProgramIds
  );
}

async function findConcurrentSuccess(evaluationId: string, membershipId: string) {
  const exclusion = await prisma.courseBoundEvaluationExclusion.findFirst({
    where: {
      course_bound_evaluation_id: evaluationId,
      course_assignment_membership_id: membershipId,
      reversed_at: { not: null },
    },
    select: { id: true },
  });
  if (!exclusion) return null;

  const membership = await prisma.courseAssignmentMembership.findUnique({
    where: { id: membershipId },
    select: { student_user_id: true },
  });
  if (!membership) return null;

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      course_bound_id: evaluationId,
      respondent_id: membership.student_user_id,
    },
    select: { id: true },
  });
  return assignment
    ? { success: true as const, data: { message: "Student was included in this evaluation." } }
    : null;
}

export async function lateIncludeCourseBoundEvaluationStudent({
  evaluationId,
  membershipId,
  reversalCategory,
  reversalOtherExplanation,
}: LateIncludeCourseBoundEvaluationInput): Promise<LateIncludeCourseBoundEvaluationResult> {
  let actorId: string | undefined;

  try {
    const session = await resolveAuthSession();
    if (!session) return { success: false, error: "Authentication required." };
    actorId = session.userId;
    const normalizedExplanation = validateReversalExplanation(
      reversalCategory,
      reversalOtherExplanation
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`
              SELECT id
              FROM "course_bound_evaluations"
              WHERE id = ${evaluationId}::uuid
              FOR UPDATE
            `;

            const evaluation = await findAssignmentForAuthorization(tx, evaluationId);
            if (!evaluation?.course_assignment) {
              throw new LateIncludeValidationError(NOT_FOUND_ERROR);
            }
            if (
              !(await isAuthorizedRosterManager(tx, session, evaluation.course_assignment)).allowed
            ) {
              throw new LateIncludeValidationError(NOT_FOUND_ERROR);
            }
            if (!evaluation.course_assignment.is_active) {
              throw new LateIncludeValidationError(NOT_FOUND_ERROR);
            }
            if (isClosedEvaluation(evaluation.status, evaluation.deadline_at)) {
              throw new LateIncludeValidationError(
                evaluation.status === DeploymentStatus.CLOSED ||
                  evaluation.status === DeploymentStatus.ARCHIVED ||
                  (evaluation.deadline_at !== null && evaluation.deadline_at.getTime() < Date.now())
                  ? "This evaluation is closed."
                  : "This evaluation is not open."
              );
            }

            const exclusion = await tx.courseBoundEvaluationExclusion.findFirst({
              where: {
                course_bound_evaluation_id: evaluation.id,
                course_assignment_id: evaluation.course_assignment_id,
                course_assignment_membership_id: membershipId,
              },
              select: {
                id: true,
                reversed_at: true,
              },
            });
            if (!exclusion) {
              throw new LateIncludeValidationError(
                "Student was not excluded from this evaluation."
              );
            }
            const membership = await tx.courseAssignmentMembership.findUnique({
              where: { id: membershipId },
              select: {
                course_assignment_id: true,
                is_active: true,
                student_user_id: true,
              },
            });
            if (
              !membership ||
              membership.course_assignment_id !== evaluation.course_assignment_id ||
              !membership.is_active
            ) {
              throw new LateIncludeValidationError("Student is not an active roster member.");
            }

            const existingAssignment = await tx.evaluationAssignment.findFirst({
              where: {
                course_bound_id: evaluation.id,
                respondent_id: membership.student_user_id,
              },
              select: { id: true },
            });
            if (existingAssignment) {
              if (exclusion.reversed_at) {
                return {
                  success: true,
                  data: { message: "Student was included in this evaluation." },
                };
              }
              throw new LateIncludeValidationError(
                "Student already has an assignment for this evaluation."
              );
            }
            if (exclusion.reversed_at) {
              throw new LateIncludeValidationError("This exclusion has already been reversed.");
            }

            await tx.courseBoundEvaluationExclusion.update({
              where: { id: exclusion.id },
              data: {
                reversal_category: reversalCategory,
                reversal_other_explanation: normalizedExplanation,
                reversed_by: session.userId,
                reversed_at: new Date(),
              },
            });
            await tx.evaluationAssignment.create({
              data: {
                course_bound_id: evaluation.id,
                respondent_id: membership.student_user_id,
              },
            });

            return {
              success: true,
              data: { message: "Student was included in this evaluation." },
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (error) {
        if (isTransactionWriteConflict(error) && attempt < 2) continue;
        if (isUniqueConstraintError(error)) {
          return (
            (await findConcurrentSuccess(evaluationId, membershipId)) ?? {
              success: false,
              error: "Student already has an assignment for this evaluation.",
            }
          );
        }
        throw error;
      }
    }

    throw new Error("Late inclusion transaction retry limit exceeded.");
  } catch (error) {
    if (error instanceof LateIncludeValidationError) {
      return { success: false, error: error.message };
    }

    const referenceId = randomUUID();
    console.error("Failed to late-include course-bound evaluation student", {
      operation: "late_include_course_bound_evaluation_student",
      actorId: actorId ?? null,
      evaluationId,
      membershipId,
      referenceId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              code: "code" in error ? String(error.code) : undefined,
            }
          : { type: typeof error },
    });
    return {
      success: false,
      error: `The evaluation inclusion could not be completed. Support reference: ${referenceId}.`,
      referenceId,
    };
  }
}
