import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import { mapTemplateStructureToSections } from "@/features/responses/services/map-template-structure";

type SubmittedResponseAnswers = Record<string, unknown>;

type BuildSubmittedResponseSectionsInput = {
  answers: SubmittedResponseAnswers;
  structureSnapshot: unknown;
};

/**
 * One frozen snapshot item plus the respondent's recorded answer. The rating
 * scale and its descriptor labels travel with the answer so a replayed Likert
 * item can name the meaning the respondent chose, not just its number.
 */
export type SubmittedResponseItem =
  | {
      kind: "quantitative";
      itemKey: string;
      prompt: string;
      answer: number | undefined;
      scale: number[];
      descriptorLabels?: string[];
    }
  | {
      kind: "qualitative";
      promptKey: string;
      prompt: string;
      answer: string | undefined;
    };

export type SubmittedResponseSection = {
  id: string;
  name: string;
  description: string;
  items: SubmittedResponseItem[];
};

export function buildSubmittedResponseSections({
  answers,
  structureSnapshot,
}: BuildSubmittedResponseSectionsInput): SubmittedResponseSection[] {
  return mapTemplateStructureToSections(structureSnapshot).map((section) => ({
    id: section.id,
    name: section.name,
    description: section.description,
    items: section.items.map((item): SubmittedResponseItem => {
      if (item.kind === "quantitative") {
        const rawAnswer =
          answers[buildStudentEvaluationAnswerKey(section.id, "quantitative", item.itemKey)];

        return {
          kind: "quantitative",
          itemKey: item.itemKey,
          prompt: item.prompt,
          answer: typeof rawAnswer === "number" ? rawAnswer : undefined,
          scale: item.scale,
          ...(item.descriptorLabels ? { descriptorLabels: item.descriptorLabels } : {}),
        };
      }

      // Blank qualitative text is a skipped optional prompt, not recorded answer text.
      const rawText =
        answers[buildStudentEvaluationAnswerKey(section.id, "qualitative", item.promptKey)];
      const text = typeof rawText === "string" ? rawText : "";

      return {
        kind: "qualitative",
        promptKey: item.promptKey,
        prompt: item.prompt,
        answer: text.trim().length > 0 ? text : undefined,
      };
    }),
  }));
}

export type SubmittedResponseReview = {
  responseId: string;
  evaluationTitle: string;
  courseTitle: string | null;
  programLabel: string;
  submittedAt: Date;
  sections: SubmittedResponseSection[];
};

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

export async function getStudentSubmittedResponseReview(
  responseId: string
): Promise<SubmittedResponseReview | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  const response = await prisma.response.findFirst({
    where: {
      id: responseId,
      respondent_id: authSession.userId,
      status: "SUBMITTED",
    },
    include: {
      assignment: {
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
        },
      },
      qual_items: true,
      quant_items: true,
    },
  });

  if (!response?.submitted_at) {
    return null;
  }

  const answers: Record<string, string | number> = {};

  for (const item of response.quant_items) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "quantitative", item.item_key)] =
      item.rating_value;
  }

  for (const item of response.qual_items) {
    answers[buildStudentEvaluationAnswerKey(item.section_key, "qualitative", item.prompt_key)] =
      item.text_content;
  }

  if (response.assignment.course_bound) {
    const ca = response.assignment.course_bound.course_assignment;

    return {
      courseTitle: ca.course.title,
      evaluationTitle:
        response.assignment.course_bound.deployment_name ??
        response.assignment.course_bound.instrument.template.name,
      programLabel: ca.course.major?.name ?? ca.program?.name ?? "Program context unavailable",
      responseId: response.id,
      sections: buildSubmittedResponseSections({
        answers,
        structureSnapshot: response.assignment.course_bound.instrument.structure_snapshot,
      }),
      submittedAt: response.submitted_at,
    };
  }

  if (response.assignment.central_deployment) {
    return {
      courseTitle: null,
      evaluationTitle:
        response.assignment.central_deployment.deployment_name ??
        response.assignment.central_deployment.instrument.template.name,
      programLabel: buildCentralProgramLabel({
        majorName: response.assignment.central_deployment.major?.name ?? null,
        programCode: response.assignment.central_deployment.program?.code ?? null,
        programName: response.assignment.central_deployment.program?.name ?? null,
        yearLevelName: response.assignment.central_deployment.year_level
          ? getYearLevelDisplay(response.assignment.central_deployment.year_level)
          : null,
      }),
      responseId: response.id,
      sections: buildSubmittedResponseSections({
        answers,
        structureSnapshot: response.assignment.central_deployment.instrument.structure_snapshot,
      }),
      submittedAt: response.submitted_at,
    };
  }

  return null;
}
