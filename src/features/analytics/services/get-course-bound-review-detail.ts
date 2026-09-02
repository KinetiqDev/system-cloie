import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { eng } from "stopword";
import { prisma } from "@/lib/db/prisma";
import { resolveReviewerProgramScope } from "@/features/academic-structure/services/resolve-reviewer-program-scope";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { CourseBoundReviewDetail, WordCloudToken } from "../types";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
import {
  buildAnonymizedRespondentLabel,
  buildReviewerEvaluationScope,
  mean,
  pickReviewerRole,
} from "./shared";

const nlp = winkNLP(model);
const stopWords = new Set(eng);

export function buildReviewWordCloudTokens(texts: string[]): WordCloudToken[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const tokens = nlp.readDoc(text).tokens().out(nlp.its.normal) as string[];

    for (const token of tokens) {
      const normalized = token.toLowerCase();

      if (!/^[a-z][a-z-]*$/.test(normalized)) {
        continue;
      }

      if (stopWords.has(normalized)) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([text, value]) => ({ text, value }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }
      return left.text.localeCompare(right.text);
    });
}

export async function getCourseBoundReviewDetail(
  evaluationId: string,
  programId?: string
): Promise<CourseBoundReviewDetail | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  const reviewerRole = pickReviewerRole(authSession.activeRole);

  if (!reviewerRole) {
    return null;
  }

  if (reviewerRole === "PROGRAM_HEAD") {
    if (!programId || !(await resolveProgramHeadContext(programId)).success) {
      return null;
    }
  }

  const programScope = await resolveReviewerProgramScope({
    ...(reviewerRole === "PROGRAM_HEAD" && programId ? { programId } : {}),
    reviewerId: authSession.userId,
    reviewerRole,
  });

  if (Array.isArray(programScope) && programScope.length === 0) {
    return null;
  }

  const evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: {
      id: evaluationId,
      ...buildReviewerEvaluationScope({
        programScope,
        reviewerId: authSession.userId,
        reviewerRole,
      }),
    },
    include: {
      assignments: {
        where: {
          response: {
            is: {
              status: "SUBMITTED",
            },
          },
        },
        include: {
          response: {
            include: {
              qual_items: true,
              quant_items: true,
            },
          },
        },
      },
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
      cilo_question_bindings: {
        orderBy: [{ created_at: "asc" }],
      },
      instrument: {
        include: {
          template: true,
        },
      },
      term_instance: {
        include: {
          school_year: true,
        },
      },
    },
  });

  if (!evaluation) {
    return null;
  }

  const submittedResponses = evaluation.assignments
    .map((assignment) => assignment.response)
    .filter((response): response is NonNullable<typeof response> => Boolean(response));
  const allQuantRatings = submittedResponses.flatMap((response) =>
    response.quant_items.map((item) => item.rating_value)
  );
  const qualitativeTexts = submittedResponses
    .flatMap((response) => response.qual_items.map((item) => item.text_content))
    .filter((text) => text.trim().length > 0);

  const sections = (
    Array.isArray(evaluation.instrument.structure_snapshot)
      ? evaluation.instrument.structure_snapshot
      : []
  )
    .filter(isSnapshotSection)
    .map((section) => {
      const items = getSnapshotSectionItems(section);
      const quantitativeItems = items.filter((item) => item.kind === "quantitative");
      const qualitativeItems = items.filter((item) => item.kind === "qualitative");

      const questions = quantitativeItems.map((item) => {
        const values = submittedResponses
          .flatMap((response) => response.quant_items)
          .filter((entry) => entry.section_key === section.key && entry.item_key === item.key)
          .map((entry) => entry.rating_value);

        return {
          itemKey: item.key,
          mean: mean(values),
          prompt: item.prompt,
        };
      });

      const sectionValues = submittedResponses
        .flatMap((response) => response.quant_items)
        .filter((entry) => entry.section_key === section.key)
        .map((entry) => entry.rating_value);

      return {
        id: section.key,
        mean: mean(sectionValues),
        name: section.title,
        qualitativePromptCount: qualitativeItems.length,
        quantitativeQuestionCount: quantitativeItems.length,
        questions,
      };
    });

  const ciloMetrics = (evaluation.cilo_question_bindings ?? []).map((binding, index) => {
    const values = submittedResponses
      .flatMap((response) => response.quant_items)
      .filter(
        (entry) =>
          entry.cilo_question_binding_id === binding.id ||
          (!entry.cilo_question_binding_id &&
            entry.section_key === binding.section_key &&
            entry.item_key === binding.item_key)
      )
      .map((entry) => entry.rating_value);

    return {
      bindingId: binding.id,
      ciloDescription: binding.cilo_description_snapshot,
      ciloId: binding.cilo_id,
      ciloLabel: `CILO ${index + 1}`,
      itemKey: binding.item_key,
      mean: mean(values),
      questionPrompt: binding.question_prompt_snapshot,
      sectionKey: binding.section_key,
    };
  });

  const responseCards = submittedResponses
    .map((response) => ({
      overallMean: mean(response.quant_items.map((item) => item.rating_value)),
      responseId: response.id,
      respondentLabel: buildAnonymizedRespondentLabel(response.id),
      submittedAt: response.submitted_at ?? new Date(0),
    }))
    .sort((left, right) => left.submittedAt.getTime() - right.submittedAt.getTime());

  const ti = evaluation.term_instance;
  const termInstanceLabel = formatTermInstanceLabel(ti.school_year.code, ti.semester, ti.term);

  const ca = evaluation.course_assignment;

  return {
    termInstanceLabel,
    ciloMetrics,
    courseTitle: ca.course.title,
    deadlineAt: evaluation.deadline_at,
    evaluationId: evaluation.id,
    evaluationTitle: evaluation.deployment_name ?? evaluation.instrument.template.name,
    overallMean: mean(allQuantRatings),
    programLabel: ca.course.major?.name ?? ca.program.name,
    qualitativeItemCount: qualitativeTexts.length,
    responseCards,
    responseCount: submittedResponses.length,
    reviewerRole,
    sections,
    wordCloudTokens: buildReviewWordCloudTokens(qualitativeTexts),
  };
}
