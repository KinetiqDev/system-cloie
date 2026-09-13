// fallow-ignore-file code-duplication
import { prisma } from "@/lib/db/prisma";
import { resolveReviewerProgramScope } from "@/features/academic-structure/services/resolve-reviewer-program-scope";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { resolveCiloLabels } from "@/features/analytics/aggregators/cilo";
import type { CourseBoundCiloMetric, CourseBoundReviewDetail, WordCloudToken } from "../types";
import { qualitativeNlp, qualitativeStopWords } from "./qualitative-nlp";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
import {
  buildAnonymizedRespondentLabel,
  buildReviewerEvaluationScope,
  mean,
  pickReviewerRole,
} from "./shared";

/** Normalized, stopword-filtered word tokens for one qualitative answer. */
export function tokenizeReviewText(text: string): string[] {
  const tokens = qualitativeNlp.readDoc(text).tokens().out(qualitativeNlp.its.normal) as string[];
  const normalized: string[] = [];

  for (const token of tokens) {
    const candidate = token.toLowerCase();

    if (!/^[a-z][a-z-]*$/.test(candidate)) {
      continue;
    }

    if (qualitativeStopWords.has(candidate)) {
      continue;
    }

    normalized.push(candidate);
  }

  return normalized;
}

export function buildReviewWordCloudTokens(texts: string[]): WordCloudToken[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    for (const token of tokenizeReviewText(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
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

// fallow-ignore-next-line complexity
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
      ...buildReviewerEvaluationScope({ programScope }),
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
  const ciloLabels = resolveCiloLabels(evaluation.cilos_snapshot, [
    ...new Set(
      (evaluation.cilo_question_bindings ?? []).flatMap((binding) => binding.cilo_id ?? [])
    ),
  ]);
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

  // One CILO may be evidenced by several Likert questions, so bindings group by
  // CILO and every grouped question's ratings pool into that CILO's single mean.
  // A binding whose CILO is gone (archived, or deleted with SetNull) keeps its
  // own group: there is no CILO left to pool it under.
  const groupKeyByBindingId = new Map<string, string>();
  const groupKeyByQuestionKey = new Map<string, string>();
  const ciloGroups = new Map<
    string,
    {
      ciloDescription: string;
      ciloId: string | null;
      questions: Map<
        string,
        { itemKey: string; prompt: string; sectionKey: string; values: number[] }
      >;
    }
  >();

  // Submitted answers resolve their binding by ID first and by question keys
  // otherwise, because a rating may predate the binding-ID column.
  for (const binding of evaluation.cilo_question_bindings ?? []) {
    const groupKey = binding.cilo_id ?? `binding:${binding.id}`;
    groupKeyByBindingId.set(binding.id, groupKey);

    let group = ciloGroups.get(groupKey);
    if (!group) {
      group = {
        ciloDescription: binding.cilo_description_snapshot,
        ciloId: binding.cilo_id,
        questions: new Map(),
      };
      ciloGroups.set(groupKey, group);
    }

    const questionKey = `${binding.section_key}::${binding.item_key}`;
    groupKeyByQuestionKey.set(questionKey, groupKey);
    if (!group.questions.has(questionKey)) {
      group.questions.set(questionKey, {
        itemKey: binding.item_key,
        prompt: binding.question_prompt_snapshot,
        sectionKey: binding.section_key,
        values: [],
      });
    }
  }

  for (const entry of submittedResponses.flatMap((response) => response.quant_items)) {
    const groupKey = entry.cilo_question_binding_id
      ? groupKeyByBindingId.get(entry.cilo_question_binding_id)
      : groupKeyByQuestionKey.get(`${entry.section_key}::${entry.item_key}`);
    const question = groupKey
      ? ciloGroups.get(groupKey)?.questions.get(`${entry.section_key}::${entry.item_key}`)
      : undefined;
    question?.values.push(entry.rating_value);
  }

  const ciloPublishOrder = new Map([...ciloLabels.keys()].map((id, index) => [id, index]));

  const ciloMetrics: CourseBoundCiloMetric[] = [...ciloGroups.entries()]
    .map(([key, group]) => {
      const entries = [...group.questions.values()];
      const questions = entries
        .map(({ itemKey, prompt, sectionKey, values }) => ({
          itemKey,
          mean: mean(values),
          prompt,
          sectionKey,
        }))
        .sort(
          (left, right) =>
            left.sectionKey.localeCompare(right.sectionKey) ||
            left.itemKey.localeCompare(right.itemKey)
        );
      return {
        ciloDescription: group.ciloDescription,
        ciloId: group.ciloId,
        ciloLabel: group.ciloId ? (ciloLabels.get(group.ciloId) ?? "CILO") : "Unassigned CILO",
        key,
        mean: mean(entries.flatMap((question) => question.values)),
        questions,
      };
    })
    .sort((left, right) => {
      const leftOrder = left.ciloId ? (ciloPublishOrder.get(left.ciloId) ?? 0) : Number.MAX_VALUE;
      const rightOrder = right.ciloId
        ? (ciloPublishOrder.get(right.ciloId) ?? 0)
        : Number.MAX_VALUE;
      return leftOrder - rightOrder || left.ciloLabel.localeCompare(right.ciloLabel);
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
