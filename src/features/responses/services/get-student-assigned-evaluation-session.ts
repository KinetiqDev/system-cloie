import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type {
  StudentEvaluationSection,
  StudentEvaluationSession,
} from "@/features/responses/types";
import {
  isCentralDeploymentAvailable,
  isCourseBoundEvaluationAvailable,
} from "./course-bound-availability";
import {
  mapSavedAnswerItems,
  mapStructureSnapshotToSections,
} from "./get-student-course-bound-evaluation-session";

function countSectionItems(sections: StudentEvaluationSection[]) {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

function buildCentralProgramLabel(input: {
  majorName: string | null;
  programCode: string | null;
  programName: string | null;
  yearLevelName: string | null;
}) {
  return [
    input.programCode ?? input.programName ?? "Program-wide",
    input.majorName,
    input.yearLevelName,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" • ");
}

export type StudentAssignedEvaluationSession = {
  assignmentId: string;
  courseTitle: string | null;
  deadlineAt: Date | null;
  deploymentType: "CENTRAL" | "COURSE_BOUND";
  evaluationTitle: string;
  programLabel: string;
  savedAnswers: Record<string, number | string>;
  sections: StudentEvaluationSection[];
  session: StudentEvaluationSession;
};

export async function getStudentAssignedEvaluationSession(
  assignmentId: string
): Promise<StudentAssignedEvaluationSession | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
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
          instrument: {
            include: {
              template: true,
            },
          },
          major: true,
          program: true,
        },
      },
      course_bound: {
        include: {
          course_assignment: {
            include: {
              course: {
                include: {
                  major: true,
                },
              },
              program: true,
            },
          },
          instrument: {
            include: {
              template: true,
            },
          },
        },
      },
      response: {
        include: {
          qual_items: true,
          quant_items: true,
        },
      },
    },
  });

  if (!assignment) {
    return null;
  }

  if (assignment.course_bound) {
    const evaluation = assignment.course_bound;

    if (!isCourseBoundEvaluationAvailable(evaluation)) {
      return null;
    }

    if (!(assignment.response?.submitted_at ?? null)) {
      const eligibility = await resolveCourseBoundEvaluationEligibility(
        toCourseBoundEvaluationEligibilityAssignment(evaluation.course_assignment),
        authSession.userId
      );
      if (!eligibility.eligible) return null;
    }

    const ca = evaluation.course_assignment;

    const sections = mapStructureSnapshotToSections(evaluation.instrument.structure_snapshot);
    const response = assignment.response ?? null;
    const savedAnswers = response
      ? mapSavedAnswerItems({
          qualitativeItems: response.qual_items,
          quantitativeItems: response.quant_items,
        })
      : {};
    const answeredItems = response ? response.qual_items.length + response.quant_items.length : 0;

    return {
      assignmentId: assignment.id,
      courseTitle: ca.course.title,
      deadlineAt: evaluation.deadline_at,
      deploymentType: "COURSE_BOUND",
      evaluationTitle: evaluation.deployment_name ?? evaluation.instrument.template.name,
      programLabel: ca.course.major?.name ?? ca.program.name,
      savedAnswers,
      sections,
      session: {
        answeredItems,
        responseId: response?.id ?? null,
        submittedAt: response?.submitted_at ?? null,
        totalItems: countSectionItems(sections),
      },
    };
  }

  if (
    assignment.central_deployment &&
    assignment.central_deployment.target_stakeholder === "STUDENT"
  ) {
    const deployment = assignment.central_deployment;

    if (!isCentralDeploymentAvailable(deployment)) {
      return null;
    }

    const sections = mapStructureSnapshotToSections(deployment.instrument.structure_snapshot);
    const response = assignment.response ?? null;
    const savedAnswers = response
      ? mapSavedAnswerItems({
          qualitativeItems: response.qual_items,
          quantitativeItems: response.quant_items,
        })
      : {};
    const answeredItems = response ? response.qual_items.length + response.quant_items.length : 0;

    return {
      assignmentId: assignment.id,
      courseTitle: null,
      deadlineAt: deployment.deadline_at,
      deploymentType: "CENTRAL",
      evaluationTitle: deployment.deployment_name ?? deployment.instrument.template.name,
      programLabel: buildCentralProgramLabel({
        majorName: deployment.major?.name ?? null,
        programCode: deployment.program?.code ?? null,
        programName: deployment.program?.name ?? null,
        yearLevelName: deployment.year_level ? getYearLevelDisplay(deployment.year_level) : null,
      }),
      savedAnswers,
      sections,
      session: {
        answeredItems,
        responseId: response?.id ?? null,
        submittedAt: response?.submitted_at ?? null,
        totalItems: countSectionItems(sections),
      },
    };
  }

  return null;
}
