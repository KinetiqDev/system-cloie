import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  resolveCourseBoundEvaluationEligibility,
  toCourseBoundEvaluationEligibilityAssignment,
} from "@/features/course-assignments/services/course-assignment-roster";
import { parseCourseInfoSnapshot } from "@/features/evaluations/services/course-info-snapshot";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import type {
  StudentEvaluationSection,
  StudentEvaluationSession,
} from "@/features/responses/types";
import { isCourseBoundEvaluationAvailable } from "./course-bound-availability";
import { mapTemplateStructureToSections } from "./map-template-structure";
type QuantitativeSavedAnswerItem = {
  item_key: string;
  rating_value: number;
  section_key: string;
};

type QualitativeSavedAnswerItem = {
  prompt_key: string;
  section_key: string;
  text_content: string;
};

type MapSavedAnswerItemsInput = {
  qualitativeItems: QualitativeSavedAnswerItem[];
  quantitativeItems: QuantitativeSavedAnswerItem[];
};

/**
 * Delegates to `mapTemplateStructureToSections()` for backward compatibility.
 * All format detection (legacy, intermediate, new Phase 3) is handled by the
 * shared mapper in `map-template-structure.ts`.
 */
export function mapStructureSnapshotToSections(
  structureSnapshot: unknown
): StudentEvaluationSection[] {
  return mapTemplateStructureToSections(structureSnapshot);
}

export function mapSavedAnswerItems({
  qualitativeItems,
  quantitativeItems,
}: MapSavedAnswerItemsInput): Record<string, number | string> {
  const answers: Record<string, number | string> = {};

  for (const item of quantitativeItems) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "quantitative", item.item_key)] =
      item.rating_value;
  }

  for (const item of qualitativeItems) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "qualitative", item.prompt_key)] =
      item.text_content;
  }

  return answers;
}

function countSectionItems(sections: StudentEvaluationSection[]) {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

export type StudentCourseBoundEvaluationSession = {
  assignmentId: string;
  evaluationTitle: string;
  courseTitle: string;
  programLabel: string;
  deadlineAt: Date | null;
  sections: StudentEvaluationSection[];
  session: StudentEvaluationSession;
  savedAnswers: Record<string, number | string>;
};

export async function getStudentCourseBoundEvaluationSession(
  assignmentId: string
): Promise<StudentCourseBoundEvaluationSession | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  const assignment = await prisma.evaluationAssignment.findFirst({
    where: {
      course_bound_id: { not: null },
      id: assignmentId,
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

  if (!assignment?.course_bound) {
    return null;
  }

  if (!isCourseBoundEvaluationAvailable(assignment.course_bound)) {
    return null;
  }

  if (!(assignment.response?.submitted_at ?? null)) {
    const eligibility = await resolveCourseBoundEvaluationEligibility(
      toCourseBoundEvaluationEligibilityAssignment(assignment.course_bound.course_assignment),
      authSession.userId
    );
    if (!eligibility.eligible) return null;
  }

  const sections = mapStructureSnapshotToSections(
    assignment.course_bound.instrument.structure_snapshot
  );
  const response = assignment.response ?? null;
  const savedAnswers = response
    ? mapSavedAnswerItems({
        qualitativeItems: response.qual_items,
        quantitativeItems: response.quant_items,
      })
    : {};
  const answeredItems = response ? response.qual_items.length + response.quant_items.length : 0;

  const ca = assignment.course_bound.course_assignment;
  const courseInfo = parseCourseInfoSnapshot(assignment.course_bound.course_info_snapshot);
  return {
    assignmentId: assignment.id,
    courseTitle: courseInfo?.courseTitle ?? ca.course.title,
    deadlineAt: assignment.course_bound.deadline_at,
    evaluationTitle:
      assignment.course_bound.deployment_name ?? assignment.course_bound.instrument.template.name,
    programLabel:
      courseInfo?.majorName ?? courseInfo?.programName ?? ca.course.major?.name ?? ca.program.name,
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
