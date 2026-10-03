import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import type { StudentEvaluationSection } from "@/features/responses/types";
import { DEPLOYMENT_UNAVAILABLE_ERROR, isDeploymentAvailable } from "./deployment-availability";
import { mapTemplateStructureToSections } from "./map-template-structure";
import { saveResponseDraft } from "./save-response-draft";

export type SaveStudentEvaluationDraftInput = {
  answers: Record<string, unknown>;
  assignmentId: string;
  sectionKey: string;
};

export type SaveStudentEvaluationDraftResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      savedAt: string;
      success: true;
    };

function resolveSection(
  structureSnapshot: unknown,
  sectionKey: string
): StudentEvaluationSection | null {
  return (
    mapTemplateStructureToSections(structureSnapshot).find((entry) => entry.id === sectionKey) ??
    null
  );
}

export async function saveStudentEvaluationDraft({
  answers,
  assignmentId,
  sectionKey,
}: SaveStudentEvaluationDraftInput): Promise<SaveStudentEvaluationDraftResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return {
      error: "Authentication is required.",
      success: false,
    };
  }

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      id: assignmentId,
      respondent_id: authSession.userId,
      OR: [
        { course_bound_id: { not: null } },
        {
          central_deployment: {
            is: {
              target_stakeholder: "STUDENT",
            },
          },
        },
      ],
    },
    include: {
      central_deployment: {
        include: {
          instrument: true,
        },
      },
      course_bound: {
        include: {
          course_assignment: {
            include: { course: true },
          },
          instrument: true,
        },
      },
    },
  });

  if (!assignment) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  const deployment =
    assignment.course_bound ??
    (assignment.central_deployment?.target_stakeholder === "STUDENT"
      ? assignment.central_deployment
      : null);

  if (!deployment) {
    return {
      error: "Evaluation assignment not found.",
      success: false,
    };
  }

  if (!isDeploymentAvailable(deployment)) {
    return {
      error: DEPLOYMENT_UNAVAILABLE_ERROR,
      success: false,
    };
  }

  if (assignment.course_bound) {
    const eligibility = await resolveCourseBoundEvaluationEligibility(
      toCourseBoundEvaluationEligibilityAssignment(assignment.course_bound.course_assignment),
      authSession.userId
    );
    if (!eligibility.eligible) {
      return {
        error: DEPLOYMENT_UNAVAILABLE_ERROR,
        success: false,
      };
    }
  }

  const section = resolveSection(deployment.instrument.structure_snapshot, sectionKey);

  if (!section) {
    return {
      error: `Unknown section ${sectionKey}.`,
      success: false,
    };
  }

  const result = await saveResponseDraft({
    answers,
    client: prisma,
    createData: {
      assignment_id: assignment.id,
      deployment_id: assignment.course_bound_id ?? assignment.central_deployment_id ?? "",
      deployment_type: assignment.course_bound
        ? DeploymentType.COURSE_BOUND
        : DeploymentType.CENTRAL,
      respondent_id: authSession.userId,
      status: ResponseStatus.IN_PROGRESS,
    },
    section,
  });

  if (result.status === "ALREADY_SUBMITTED") {
    return {
      error: "This evaluation has already been submitted.",
      success: false,
    };
  }

  return {
    responseId: result.responseId,
    savedAt: result.savedAt,
    success: true,
  };
}
