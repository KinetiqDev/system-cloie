import { ResponseStatus, TargetStakeholder } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { buildCiloMetrics, buildQuestionMetrics, type OutcomeItemRatingRow } from "@/features/analytics/aggregators/cilo";
import type { CiloPloMapping } from "@/features/analytics/aggregators/types";
import { groupRatingsByScale } from "@/features/analytics/aggregators/quantitative";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import { getSnapshotSectionItems, isSnapshotSection } from "@/features/analytics/services/snapshot-structure";
import { loadCiloMappings } from "./cilo-mappings";
import { buildQualitativeSummary } from "./qualitative-summary";
import { loadRespondentIdentityContexts } from "./respondent-context";
import { buildPeriodLabel } from "./period-label";
import type { ProgramHeadCourseEvaluationDetail, ProgramHeadRespondentRow } from "../types";

// ---------------------------------------------------------------------------
// Program Head course-bound evaluation detail (spec §25)
//
// CILO and question results come from the canonical p1-contracts aggregators
// over raw submitted ratings (§6.3–§6.4); participation holds over every raw
// EvaluationAssignment row (§5.12, §35); respondents are identified for the
// Program Head only (§25.5). IN_PROGRESS response bodies are never fetched.
// ---------------------------------------------------------------------------

export async function getProgramHeadCourseEvaluationDetail(
  programId: string,
  evaluationId: string
): Promise<ProgramHeadCourseEvaluationDetail | null> {
  const authSession = await resolveAuthSession();

  if (!authSession || authSession.activeRole !== ROLES.PROGRAM_HEAD) {
    return null;
  }

  const context = await resolveProgramHeadContext(programId);
  if (!context.success) {
    return null;
  }

  const evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: {
      id: evaluationId,
      course_assignment: { program_id: programId },
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
      snapshotItems.set(`${section.key}|${item.key}`, { prompt: item.prompt });
    }
  }

  const bindingByQuestionKey = new Map<string, { cilo_id: string | null; cilo_description_snapshot: string }>();
  for (const binding of evaluation.cilo_question_bindings) {
    bindingByQuestionKey.set(`${binding.section_key}|${binding.item_key}`, {
      cilo_id: binding.cilo_id,
      cilo_description_snapshot: binding.cilo_description_snapshot,
    });
  }

  const ciloIds = evaluation.cilo_question_bindings
    .map((binding) => binding.cilo_id)
    .filter((ciloId): ciloId is string => ciloId !== null);
  const ciloMappings = await loadCiloMappings(ciloIds);

  const { ratingRows, meanByResponse, submittedRespondentIds } = buildCourseRatingRows(
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
  const evaluationMean = scaleGroups.length === 1 ? scaleGroups[0].metric.mean : null;

  const qualitative = buildQualitativeSummary(submittedResponses, snapshotItems);

  const identityContexts = await loadRespondentIdentityContexts(
    submittedRespondentIds,
    TargetStakeholder.STUDENT,
    evaluation.course_assignment.term_instance.id
  );

  const respondents: ProgramHeadRespondentRow[] = submittedResponses
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

  return {
    evaluation: {
      id: evaluation.id,
      title: evaluation.deployment_name,
      courseCode: ca.course.code,
      courseTitle: ca.course.title,
      facultyName: ca.faculty?.name ?? null,
      yearLevel: ca.year_level,
      section: ca.section,
      majorLabel: ca.course.major?.name ?? null,
      periodLabel: buildPeriodLabel(ca.term_instance),
      activationAt: evaluation.activation_at,
      deadlineAt: evaluation.deadline_at,
      status: evaluation.status,
    },
    summary: {
      eligibleCount: participation.assigned,
      submittedCount: participation.submitted,
      completionRate: participation.completionRate,
      evaluationMean,
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

function buildCourseRatingRows(
  submittedResponses: SubmittedResponseWithItems[],
  snapshot: unknown,
  snapshotItems: Map<string, { prompt: string }>,
  bindingByQuestionKey: Map<string, { cilo_id: string | null; cilo_description_snapshot: string }>,
  ciloMappings: Map<string, CiloPloMapping[]>
): { ratingRows: OutcomeItemRatingRow[]; meanByResponse: Map<string, number | null>; submittedRespondentIds: string[] } {
  const ratingRows: OutcomeItemRatingRow[] = [];
  const submittedRespondentIds: string[] = [];
  const meanByResponse = new Map<string, number | null>();
  for (const response of submittedResponses) {
    submittedRespondentIds.push(response.respondent_id);
    const validRatings: number[] = [];
    for (const item of response.quant_items) {
      const scale = resolveItemScaleIdentity(snapshot, item.section_key, item.item_key);
      if (!scale || !scale.descriptors.some((descriptor) => descriptor.value === item.rating_value)) {
        continue;
      }
      const binding = bindingByQuestionKey.get(`${item.section_key}|${item.item_key}`);
      ratingRows.push({
        sectionKey: item.section_key,
        itemKey: item.item_key,
        prompt: snapshotItems.get(`${item.section_key}|${item.item_key}`)?.prompt ?? item.item_key,
        ratingValue: item.rating_value,
        responseId: response.id,
        scale,
        cilo: binding
          ? {
              id: binding.cilo_id ?? `binding-${item.section_key}-${item.item_key}`,
              label: binding.cilo_description_snapshot,
              description: binding.cilo_description_snapshot,
            }
          : null,
        ploMappings: binding ? (ciloMappings.get(binding.cilo_id ?? "") ?? []) : [],
      });
      validRatings.push(item.rating_value);
    }
    meanByResponse.set(
      response.id,
      validRatings.length === 0 ? null : validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length
    );
  }
  return { ratingRows, meanByResponse, submittedRespondentIds };
}
