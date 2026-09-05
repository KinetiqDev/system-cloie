import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type {
  StudentEvaluationListItem,
  StudentEvaluationListStatus,
  StudentEvaluationSection,
  StudentEvaluationSession,
} from "@/features/responses/types";
import {
  resolveCourseBoundEvaluationEligibilities,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import { parseCourseInfoSnapshot } from "@/features/evaluations/services/course-info-snapshot";
import { isCourseBoundEvaluationAvailable } from "./course-bound-availability";
import { mapStructureSnapshotToSections } from "./get-student-course-bound-evaluation-session";

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

type DeriveStudentEvaluationStatusInput = StudentEvaluationSession & {
  deadlineAt: Date | null;
  now?: Date;
};

type BuildStudentEvaluationListItemInput = {
  assignmentId: string;
  evaluationId: string;
  evaluationTitle: string;
  courseTitle: string;
  programLabel: string;
  facultyName: string | null;
  deadlineAt: Date | null;
  href: string | null;
  section: StudentEvaluationSection;
  session: StudentEvaluationSession;
  now?: Date;
};

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, progress));
}

export function deriveStudentEvaluationStatus({
  answeredItems,
  deadlineAt,
  now = new Date(),
  responseId,
  submittedAt,
  totalItems,
}: DeriveStudentEvaluationStatusInput): {
  progress: number;
  status: StudentEvaluationListStatus;
} {
  const progress =
    totalItems > 0 ? clampProgress(Math.round((answeredItems / totalItems) * 100)) : 0;

  if (submittedAt) {
    return { progress, status: "SUBMITTED" };
  }

  if (!responseId) {
    const timeUntilDeadline = deadlineAt ? deadlineAt.getTime() - now.getTime() : null;

    if (
      timeUntilDeadline !== null &&
      timeUntilDeadline >= 0 &&
      timeUntilDeadline <= THREE_DAYS_IN_MS
    ) {
      return { progress: 0, status: "DUE_SOON" };
    }

    return { progress: 0, status: "NOT_STARTED" };
  }

  return { progress, status: "IN_PROGRESS" };
}

export function buildStudentEvaluationListItem({
  assignmentId,
  courseTitle,
  deadlineAt,
  evaluationId,
  evaluationTitle,
  facultyName,
  href,
  now,
  programLabel,
  section,
  session,
}: BuildStudentEvaluationListItemInput): StudentEvaluationListItem {
  const { progress, status } = deriveStudentEvaluationStatus({
    answeredItems: session.answeredItems,
    deadlineAt,
    now,
    responseId: session.responseId,
    submittedAt: session.submittedAt,
    totalItems: session.totalItems,
  });

  return {
    assignmentId,
    courseTitle,
    deadlineAt,
    deploymentType: "COURSE_BOUND",
    evaluationId,
    evaluationTitle,
    facultyName,
    href,
    progress,
    programLabel,
    section,
    session,
    status,
  };
}

function countSectionItems(sections: StudentEvaluationSection[]) {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

function buildFallbackSection(): StudentEvaluationSection {
  return {
    description: "",
    id: "overview",
    items: [],
    name: "Overview",
  };
}

export async function listStudentCourseBoundEvaluations(): Promise<{
  active: StudentEvaluationListItem[];
  submitted: StudentEvaluationListItem[];
}> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return { active: [], submitted: [] };
  }

  const assignments = await prisma.evaluationAssignment.findMany({
    where: {
      course_bound_id: { not: null },
      respondent_id: authSession.userId,
    },
    include: {
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
              faculty: {
                select: {
                  name: true,
                },
              },
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
    orderBy: {
      assigned_at: "desc",
    },
  });

  const now = new Date();
  const courseBoundEligibilityAssignments = assignments.flatMap((assignment) => {
    const courseBound = assignment.course_bound;

    if (!courseBound || assignment.response?.submitted_at) return [];
    if (!isCourseBoundEvaluationAvailable(courseBound, now)) return [];

    return [toCourseBoundEvaluationEligibilityAssignment(courseBound.course_assignment)];
  });
  const courseBoundEligibilities = await resolveCourseBoundEvaluationEligibilities(
    courseBoundEligibilityAssignments,
    authSession.userId
  );

  const items = (
    await Promise.all(
      assignments
        .filter((assignment) => assignment.course_bound)
        .map(async (assignment) => {
          const courseBound = assignment.course_bound!;
          const response = assignment.response ?? null;

          if (!response?.submitted_at && !isCourseBoundEvaluationAvailable(courseBound, now)) {
            return null;
          }

          if (!response?.submitted_at) {
            const eligibility = courseBoundEligibilities.get(courseBound.course_assignment.id);
            if (!eligibility?.eligible) return null;
          }
          const ca = courseBound.course_assignment;
          const courseInfo = parseCourseInfoSnapshot(courseBound.course_info_snapshot);
          const sections = mapStructureSnapshotToSections(
            courseBound.instrument.structure_snapshot
          );
          const section = sections[0] ?? buildFallbackSection();
          const session: StudentEvaluationSession = {
            answeredItems: response ? response.qual_items.length + response.quant_items.length : 0,
            responseId: response?.id ?? null,
            submittedAt: response?.submitted_at ?? null,
            totalItems: countSectionItems(sections),
          };
          const status = deriveStudentEvaluationStatus({
            answeredItems: session.answeredItems,
            deadlineAt: courseBound.deadline_at,
            responseId: session.responseId,
            submittedAt: session.submittedAt,
            totalItems: session.totalItems,
          }).status;
          const href =
            status === "SUBMITTED"
              ? session.responseId
                ? `/student/history/${session.responseId}`
                : null
              : `/student/evaluations/${assignment.id}`;

          return buildStudentEvaluationListItem({
            assignmentId: assignment.id,
            courseTitle: courseInfo?.courseTitle ?? ca.course.title,
            deadlineAt: courseBound.deadline_at,
            evaluationId: assignment.id,
            evaluationTitle: courseBound.deployment_name ?? courseBound.instrument.template.name,
            facultyName: courseInfo?.facultyName ?? (ca.faculty ? ca.faculty.name : null),
            href,
            now,
            programLabel:
              courseInfo?.majorName ??
              courseInfo?.programName ??
              ca.course.major?.name ??
              ca.program.name,
            section,
            session,
          });
        })
    )
  ).filter((item): item is StudentEvaluationListItem => item !== null);

  return {
    active: items.filter((item) => item.status !== "SUBMITTED"),
    submitted: items.filter((item) => item.status === "SUBMITTED"),
  };
}
