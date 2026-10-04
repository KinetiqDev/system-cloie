import { DeploymentType, ResponseStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import { DEPLOYMENT_UNAVAILABLE_ERROR, isDeploymentAvailable } from "./deployment-availability";

/**
 * `STUDENT` answers Course-bound evaluations and Central evaluations targeting
 * students; `STAKEHOLDER` answers any Central evaluation (alumni, industry partner).
 */
export type AnswerAudience = "STUDENT" | "STAKEHOLDER";

type AnswerableAssignment = {
  structureSnapshot: unknown;
  createData: Prisma.ResponseUncheckedCreateInput;
  /** Published CILO question bindings; only loaded for submissions, which attribute ratings to them. */
  ciloQuestionBindings: Array<{ id: string; section_key: string; item_key: string }> | undefined;
};

type ResolveResult =
  | { success: true; data: AnswerableAssignment }
  | { success: false; error: string };

/**
 * The gates every write to a response passes before touching answers: the
 * assignment belongs to the respondent, its deployment is inside the
 * availability window, and Course-bound evaluations still have active roster
 * membership. Draft saves and final submissions share this one path.
 */
export async function resolveAnswerableAssignment({
  assignmentId,
  audience,
  userId,
  withCiloBindings,
}: {
  assignmentId: string;
  audience: AnswerAudience;
  userId: string;
  withCiloBindings: boolean;
}): Promise<ResolveResult> {
  const notFound = { success: false, error: "Evaluation assignment not found." } as const;

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      id: assignmentId,
      respondent_id: userId,
      ...(audience === "STUDENT"
        ? {
            OR: [
              { course_bound_id: { not: null } },
              { central_deployment: { is: { target_stakeholder: "STUDENT" } } },
            ],
          }
        : { central_deployment_id: { not: null } }),
    },
    include: {
      central_deployment: { include: { instrument: true } },
      course_bound: {
        include: {
          cilo_question_bindings: withCiloBindings,
          course_assignment: { include: { course: true } },
          instrument: true,
        },
      },
    },
  });

  const courseBound = audience === "STUDENT" ? assignment?.course_bound : null;
  const central = assignment?.central_deployment;
  const deployment =
    courseBound ??
    (central && (audience === "STAKEHOLDER" || central.target_stakeholder === "STUDENT")
      ? central
      : null);

  if (!assignment || !deployment) {
    return notFound;
  }

  if (!isDeploymentAvailable(deployment)) {
    return { success: false, error: DEPLOYMENT_UNAVAILABLE_ERROR };
  }

  if (courseBound) {
    const eligibility = await resolveCourseBoundEvaluationEligibility(
      toCourseBoundEvaluationEligibilityAssignment(courseBound.course_assignment),
      userId
    );
    if (!eligibility.eligible) {
      return { success: false, error: DEPLOYMENT_UNAVAILABLE_ERROR };
    }
  }

  return {
    success: true,
    data: {
      ciloQuestionBindings: courseBound?.cilo_question_bindings,
      createData: {
        assignment_id: assignment.id,
        deployment_id: courseBound
          ? assignment.course_bound_id!
          : assignment.central_deployment_id!,
        deployment_type: courseBound ? DeploymentType.COURSE_BOUND : DeploymentType.CENTRAL,
        respondent_id: userId,
        status: ResponseStatus.IN_PROGRESS,
      },
      structureSnapshot: deployment.instrument.structure_snapshot,
    },
  };
}
