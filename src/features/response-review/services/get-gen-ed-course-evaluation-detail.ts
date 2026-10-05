import { ResponseStatus, StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import {
  buildCiloMetrics,
  buildQuestionMetrics,
  type OutcomeItemRatingRow,
} from "@/features/analytics/aggregators/cilo";
import type { CiloGoMapping } from "@/features/analytics/aggregators/types";
import { groupRatingsByScale } from "@/features/analytics/aggregators/quantitative";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import {
  resolveItemScaleIdentity,
  type ScaleIdentity,
} from "@/features/analytics/aggregators/scale-identity";
import {
  getSnapshotSectionItems,
  isSnapshotSection,
} from "@/features/analytics/services/snapshot-structure";
import {
  parseCourseInfoSnapshot,
  resolveSnapshotNullableText,
  resolveSnapshotText,
} from "@/features/evaluations/services/course-info-snapshot";
import { loadCiloMappings } from "./cilo-mappings";
import { buildQualitativeSummary } from "./qualitative-summary";
import { loadRespondentIdentityContexts } from "./respondent-context";
import { buildPeriodLabel } from "./period-label";
import type { IdentifiedCourseEvaluationDetail, IdentifiedSubmittedRespondentRow } from "../types";

// ---------------------------------------------------------------------------
// General Education course evaluation detail for Coordinator identified
// review (ADR 0034)
//
// CILO and question results come from the canonical aggregators over raw
// submitted ratings; participation holds over every raw EvaluationAssignment
// row; respondents are identified for the Coordinator only. IN_PROGRESS
// response bodies are never fetched.
//
// Authorization: GEN_ED_COORDINATOR role plus a General Education Course —
// there is no selected-Program context, so a Program-specific evaluation or
// a guessed evaluation id resolves to null.
// ---------------------------------------------------------------------------

export async function getGenEdCourseEvaluationDetail(
  evaluationId: string
): Promise<IdentifiedCourseEvaluationDetail | null> {
  const authSession = await resolveAuthSession();

  if (!authSession || authSession.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return null;
  }

  const evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: {
      id: evaluationId,
      course_assignment: { course: { course_scope: "GENERAL_EDUCATION" } },
    },
    include: {
      instrument: { select: { structure_snapshot: true } },
      course_assignment: {
        include: {
          course: { include: { major: true } },
          faculty: { select: { name: true } },
          program: { select: { name: true } },
          term_instance: { include: { school_year: true } },
        },
      },
      cilo_question_bindings: { orderBy: [{ created_at: "asc" }] },
    },
  });

  if (!evaluation) {
    return null;
  }

  const [assignmentRows, submittedResponses] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: { course_bound_id: evaluationId },
      select: {
        respondent_id: true,
        response: { select: { status: true } },
      },
    }),
    prisma.response.findMany({
      where: { status: ResponseStatus.SUBMITTED, assignment: { course_bound_id: evaluationId } },
      select: {
        id: true,
        submitted_at: true,
        respondent_id: true,
        respondent: { select: { name: true } },
        quant_items: true,
        qual_items: true,
      },
    }),
  ]);

  const snapshot = evaluation.instrument.structure_snapshot;
  const snapshotItems = new Map<string, { prompt: string }>();
  for (const section of Array.isArray(snapshot) ? snapshot.filter(isSnapshotSection) : []) {
    for (const item of getSnapshotSectionItems(section)) {
      snapshotItems.set(encodeQuestionKey(section.key, item.key), { prompt: item.prompt });
    }
  }

  const bindingByQuestionKey = new Map<
    string,
    { cilo_id: string | null; cilo_description_snapshot: string }
  >();
  for (const binding of evaluation.cilo_question_bindings) {
    bindingByQuestionKey.set(encodeQuestionKey(binding.section_key, binding.item_key), {
      cilo_id: binding.cilo_id,
      cilo_description_snapshot: binding.cilo_description_snapshot,
    });
  }

  const ciloMappings = await loadCiloMappings(
    evaluation.cilo_question_bindings
      .map((binding) => binding.cilo_id)
      .filter((ciloId): ciloId is string => ciloId !== null)
  );

  const { ratingRows, meanByResponse } = buildCourseRatingRows(
    submittedResponses,
    snapshot,
    snapshotItems,
    bindingByQuestionKey,
    ciloMappings
  );

  const ciloResults = buildCiloMetrics(ratingRows);
  const questionResults = buildQuestionMetrics(ratingRows);

  const scaleGroups = groupRatingsByScale(
    ratingRows.map((row) => ({
      rating: { value: row.ratingValue, responseId: row.responseId },
      scale: row.scale,
    }))
  );

  const qualitative = buildQualitativeSummary(submittedResponses, snapshotItems);

  const identityContexts = await loadRespondentIdentityContexts(
    submittedResponses.map((response) => response.respondent_id),
    TargetStakeholder.STUDENT,
    evaluation.course_assignment.term_instance.id
  );

  const respondents: IdentifiedSubmittedRespondentRow[] = submittedResponses
    .map((response) => {
      const identity = identityContexts.get(response.respondent_id);
      return {
        responseId: response.id,
        name: response.respondent.name,
        stakeholder: TargetStakeholder.STUDENT,
        majorLabel: identity?.kind === "STUDENT" ? identity.majorLabel : null,
        yearLevel: identity?.kind === "STUDENT" ? identity.yearLevel : null,
        section: identity?.kind === "STUDENT" ? identity.section : null,
        submittedAt: response.submitted_at ?? new Date(0),
        quantitativeMean: meanByResponse.get(response.id) ?? null,
      };
    })
    .sort((left, right) => left.submittedAt.getTime() - right.submittedAt.getTime());

  const participation = buildParticipationSummary(
    assignmentRows.map((row) => ({
      respondentId: row.respondent_id,
      stakeholder: TargetStakeholder.STUDENT,
      responseStatus: row.response?.status ?? null,
    }))
  );

  const ca = evaluation.course_assignment;
  const courseInfo = parseCourseInfoSnapshot(evaluation.course_info_snapshot);
  return {
    evaluation: {
      id: evaluation.id,
      title: evaluation.deployment_name,
      courseCode: resolveSnapshotText(courseInfo, "courseCode", ca.course.code),
      courseTitle: resolveSnapshotText(courseInfo, "courseTitle", ca.course.title),
      facultyName: resolveSnapshotNullableText(courseInfo, "facultyName", ca.faculty?.name ?? null),
      yearLevel: resolveSnapshotText(courseInfo, "yearLevel", ca.year_level) as YearLevel,
      section: resolveSnapshotText(courseInfo, "section", ca.section) as StudentSection,
      majorLabel: resolveSnapshotNullableText(
        courseInfo,
        "majorName",
        ca.course.major?.name ?? null
      ),
      periodLabel: buildPeriodLabel({
        school_year: {
          code: resolveSnapshotText(
            courseInfo,
            "schoolYearCode",
            ca.term_instance.school_year.code
          ),
        },
        semester: resolveSnapshotText(courseInfo, "semester", ca.term_instance.semester),
        term: resolveSnapshotNullableText(courseInfo, "term", ca.term_instance.term),
      }),
      activationAt: evaluation.activation_at,
      deadlineAt: evaluation.deadline_at,
      status: evaluation.status,
    },
    summary: {
      eligibleCount: participation.assigned,
      submittedCount: participation.submitted,
      completionRate: participation.completionRate,
      evaluationMean: scaleGroups.length === 1 ? scaleGroups[0].metric.mean : null,
      evaluationScaleCount: scaleGroups.length,
      ciloCount: ciloResults.length,
      qualitativeAnswerCount: qualitative.answerCount,
      qualitativeRespondentCount: qualitative.respondentCount,
    },
    participation,
    ciloResults,
    questionResults,
    qualitative,
    respondents,
  };
}

type SubmittedResponseWithItems = {
  id: string;
  submitted_at: Date | null;
  respondent_id: string;
  quant_items: Array<{ section_key: string; item_key: string; rating_value: number }>;
  qual_items: Array<{ section_key: string; prompt_key: string; text_content: string }>;
};

type CiloBindingSnapshot = {
  cilo_id: string | null;
  cilo_description_snapshot: string;
};

function buildCourseRatingRows(
  submittedResponses: SubmittedResponseWithItems[],
  snapshot: unknown,
  snapshotItems: Map<string, { prompt: string }>,
  bindingByQuestionKey: Map<string, CiloBindingSnapshot>,
  ciloMappings: Map<string, CiloGoMapping[]>
): {
  ratingRows: OutcomeItemRatingRow[];
  meanByResponse: Map<string, number | null>;
} {
  const ratingRows: OutcomeItemRatingRow[] = [];
  const meanByResponse = new Map<string, number | null>();
  for (const response of submittedResponses) {
    const scaleKeys = new Set<string>();
    const validRatings: number[] = [];
    for (const item of response.quant_items) {
      const scale = resolveItemScaleIdentity(snapshot, item.section_key, item.item_key);
      if (!scale || !scale.descriptors.some((d) => d.value === item.rating_value)) {
        continue;
      }
      scaleKeys.add(scale.key);
      validRatings.push(item.rating_value);
      const questionKey = encodeQuestionKey(item.section_key, item.item_key);
      const binding = bindingByQuestionKey.get(questionKey);
      ratingRows.push(
        toCourseRatingRow(item, scale, response.id, snapshotItems, binding, ciloMappings)
      );
    }
    meanByResponse.set(
      response.id,
      validRatings.length === 0 || scaleKeys.size > 1
        ? null
        : validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length
    );
  }
  return { ratingRows, meanByResponse };
}

function toCourseRatingRow(
  item: { section_key: string; item_key: string; rating_value: number },
  scale: ScaleIdentity,
  responseId: string,
  snapshotItems: Map<string, { prompt: string }>,
  binding: CiloBindingSnapshot | undefined,
  ciloMappings: Map<string, CiloGoMapping[]>
): OutcomeItemRatingRow {
  const questionKey = encodeQuestionKey(item.section_key, item.item_key);
  return {
    sectionKey: item.section_key,
    itemKey: item.item_key,
    prompt: snapshotItems.get(questionKey)?.prompt ?? item.item_key,
    ratingValue: item.rating_value,
    responseId,
    scale,
    cilo: binding
      ? {
          id: binding.cilo_id ?? `binding-${item.section_key}-${item.item_key}`,
          label: binding.cilo_description_snapshot,
          description: binding.cilo_description_snapshot,
        }
      : null,
    goMappings: binding ? (ciloMappings.get(binding.cilo_id ?? "") ?? []) : [],
  };
}
