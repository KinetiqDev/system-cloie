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
  parseCourseInfoSnapshot,
  resolveSnapshotProgramLabel,
  resolveSnapshotText,
} from "@/features/evaluations/services/course-info-snapshot";
import {
  mapSavedAnswerItems,
  mapStructureSnapshotToSections,
} from "./get-student-course-bound-evaluation-session";

function countSectionItems(sections: StudentEvaluationSection[]) {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

/** The availability window plus the assignment whose membership the gate reads. */
type CourseBoundEvaluationRecord = {
  activation_at: Date | null;
  deadline_at: Date | null;
  status: Parameters<typeof isCourseBoundEvaluationAvailable>[0]["status"];
  course_assignment: Parameters<typeof toCourseBoundEvaluationEligibilityAssignment>[0];
};

/**
 * Course-bound read authorization for one assignment. The availability window
 * and roster eligibility govern *answering*: an already-submitted response
 * stays readable after the window closes and after membership is lost (the
 * Responses contract revokes only unsubmitted access), while unsubmitted work
 * needs both gates. This mirrors the list reader and the sibling session reads.
 */
async function courseBoundAssignmentIsReadable(
  evaluation: CourseBoundEvaluationRecord,
  response: AssignmentResponseRecord | null,
  studentUserId: string
): Promise<boolean> {
  if (response?.submitted_at ?? null) {
    return true;
  }
  if (!isCourseBoundEvaluationAvailable(evaluation)) {
    return false;
  }
  const eligibility = await resolveCourseBoundEvaluationEligibility(
    toCourseBoundEvaluationEligibilityAssignment(evaluation.course_assignment),
    studentUserId
  );
  return eligibility.eligible;
}

type AssignmentResponseRecord = {
  id: string;
  submitted_at: Date | null;
  qual_items: Array<{ prompt_key: string; section_key: string; text_content: string }>;
  quant_items: Array<{ item_key: string; rating_value: number; section_key: string }>;
};

/**
 * Prepared wizard session for one assignment: the frozen structure mapped to
 * sections, the saved answers keyed for the browser, and the progress session.
 * Course-bound and Central assignments share this derivation — their labels and
 * authorization gates are the only differences — so the structure snapshot and
 * response shapes are interpreted in exactly one place.
 */
function prepareStudentEvaluationSession(
  structureSnapshot: unknown,
  response: AssignmentResponseRecord | null
): {
  sections: StudentEvaluationSection[];
  savedAnswers: Record<string, number | string>;
  session: StudentEvaluationSession;
} {
  const sections = mapStructureSnapshotToSections(structureSnapshot);
  const savedAnswers = response
    ? mapSavedAnswerItems({
        qualitativeItems: response.qual_items,
        quantitativeItems: response.quant_items,
      })
    : {};
  const answeredItems = response ? response.qual_items.length + response.quant_items.length : 0;

  return {
    sections,
    savedAnswers,
    session: {
      answeredItems,
      responseId: response?.id ?? null,
      submittedAt: response?.submitted_at ?? null,
      totalItems: countSectionItems(sections),
    },
  };
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

    if (
      !(await courseBoundAssignmentIsReadable(
        evaluation,
        assignment.response ?? null,
        authSession.userId
      ))
    ) {
      return null;
    }

    const ca = evaluation.course_assignment;
    const courseInfo = parseCourseInfoSnapshot(evaluation.course_info_snapshot);
    const prepared = prepareStudentEvaluationSession(
      evaluation.instrument.structure_snapshot,
      assignment.response ?? null
    );

    return {
      assignmentId: assignment.id,
      courseTitle: resolveSnapshotText(courseInfo, "courseTitle", ca.course.title),
      deadlineAt: evaluation.deadline_at,
      deploymentType: "COURSE_BOUND",
      evaluationTitle: evaluation.deployment_name ?? evaluation.instrument.template.name,
      programLabel: resolveSnapshotProgramLabel(
        courseInfo,
        ca.course.major?.name ?? null,
        ca.program.name
      ),
      ...prepared,
    };
  }

  if (
    assignment.central_deployment &&
    assignment.central_deployment.target_stakeholder === "STUDENT"
  ) {
    const deployment = assignment.central_deployment;

    // Keep submitted evaluations readable after the deployment window closes:
    // only the wizard needs the availability gate, and this route redirects a
    // submitted session to its history page rather than 404-ing it.
    const response = assignment.response ?? null;
    if (!(response?.submitted_at ?? null) && !isCentralDeploymentAvailable(deployment)) {
      return null;
    }

    const prepared = prepareStudentEvaluationSession(
      deployment.instrument.structure_snapshot,
      response
    );

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
      ...prepared,
    };
  }

  return null;
}
