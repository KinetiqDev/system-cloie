import { ResponseStatus, TargetStakeholder } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import {
  buildQuestionMetrics,
  type OutcomeItemRatingRow,
} from "@/features/analytics/aggregators/cilo";
import {
  buildProgramWidePoMetrics,
  type CentralPoRatingRow,
} from "@/features/analytics/aggregators/po";
import { groupRatingsByScale } from "@/features/analytics/aggregators/quantitative";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";
import {
  getSnapshotSectionItems,
  isSnapshotSection,
} from "@/features/analytics/services/snapshot-structure";
import {
  loadRespondentIdentityContexts,
  type RespondentIdentityContext,
} from "./respondent-context";
import { buildQualitativeSummary } from "./qualitative-summary";
import { buildPeriodLabel } from "./period-label";
import type {
  ProgramHeadAssignmentRespondentRow,
  ProgramHeadCentralEvaluationDetail,
  ProgramHeadCentralQuestionResult,
  ProgramWidePoBinding,
} from "../types";

// ---------------------------------------------------------------------------
// Program Head program-wide evaluation detail (spec §26)
//
// Direct PO results come from CentralDeploymentPoSnapshot bindings (§5.9)
// grouped by po_id ?? po_code_snapshot; question results use the same
// canonical aggregators with cilo:null; participation holds over raw
// EvaluationAssignment rows; respondents are identified. IN_PROGRESS bodies
// are never fetched.
// ---------------------------------------------------------------------------

export async function getProgramHeadCentralEvaluationDetail(
  programId: string,
  deploymentId: string
): Promise<ProgramHeadCentralEvaluationDetail | null> {
  const authSession = await resolveAuthSession();

  if (!authSession || authSession.activeRole !== ROLES.PROGRAM_HEAD) {
    return null;
  }

  const context = await resolveProgramHeadContext(programId);
  if (!context.success) {
    return null;
  }

  const deployment = await prisma.centralDeployment.findFirst({
    where: { id: deploymentId, program_id: programId },
    include: {
      instrument: { select: { version_number: true, structure_snapshot: true } },
      program: { select: { name: true } },
      major: { select: { name: true } },
      term_instance: { include: { school_year: true } },
      po_snapshots: true,
    },
  });

  if (!deployment) {
    return null;
  }

  const [assignmentRows, submittedResponses] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: { central_deployment_id: deploymentId },
      select: {
        id: true,
        assigned_at: true,
        respondent_id: true,
        respondent: { select: { name: true } },
        response: { select: { id: true, status: true, submitted_at: true } },
      },
    }),
    prisma.response.findMany({
      where: {
        status: ResponseStatus.SUBMITTED,
        assignment: { central_deployment_id: deploymentId },
      },
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

  const snapshot = deployment.instrument.structure_snapshot;
  const { snapshotItems, poByQuestionKey, poDisplayByQuestionKey } = buildCentralIndexes(
    snapshot,
    deployment.po_snapshots
  );

  const { ratingRows, centralGoRows, meanByResponse } = buildCentralRatingRows(
    submittedResponses,
    snapshot,
    snapshotItems,
    poByQuestionKey
  );

  const poResults = buildProgramWidePoMetrics(centralGoRows);
  const questionResultsBase = buildQuestionMetrics(ratingRows);

  // Attach PO bindings to question results
  const questionResults: ProgramHeadCentralQuestionResult[] = questionResultsBase.map((q) => ({
    ...q,
    poBindings: poDisplayByQuestionKey.get(encodeQuestionKey(q.sectionKey, q.itemKey)) ?? [],
  }));

  const scaleGroups = groupRatingsByScale(
    ratingRows.map((row) => ({
      rating: { value: row.ratingValue, responseId: row.responseId },
      scale: row.scale,
    }))
  );
  const evaluationMean = scaleGroups.length === 1 ? scaleGroups[0].metric.mean : null;

  const qualitative = buildQualitativeSummary(submittedResponses, snapshotItems);

  const identityContexts = await loadRespondentIdentityContexts(
    assignmentRows.map((row) => row.respondent_id),
    deployment.target_stakeholder,
    deployment.term_instance.id
  );

  const respondents: ProgramHeadAssignmentRespondentRow[] = assignmentRows
    .map((assignment) =>
      buildAssignmentRespondentRow({
        assignment,
        identity: identityContexts.get(assignment.respondent_id),
        meanByResponse,
        stakeholder: deployment.target_stakeholder,
      })
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  const participation = buildParticipationSummary(
    assignmentRows.map((row) => ({
      respondentId: row.respondent_id,
      stakeholder: deployment.target_stakeholder,
      responseStatus: row.response?.status ?? null,
    }))
  );

  return {
    evaluation: {
      id: deployment.id,
      title: deployment.deployment_name,
      stakeholder: deployment.target_stakeholder,
      targetProgramLabel: deployment.program?.name ?? null,
      targetMajorLabel: deployment.major?.name ?? null,
      targetYearLevel: deployment.year_level,
      instrumentVersion: deployment.instrument.version_number,
      periodLabel: buildPeriodLabel(deployment.term_instance),
      activationAt: deployment.activation_at,
      deadlineAt: deployment.deadline_at,
      status: deployment.status,
    },
    summary: {
      assignedCount: participation.assigned,
      submittedCount: participation.submitted,
      completionRate: participation.completionRate,
      evaluationMean,
      evaluationScaleCount: scaleGroups.length,
      qualitativeAnswerCount: qualitative.answerCount,
      qualitativeRespondentCount: qualitative.respondentCount,
    },
    participation,
    poResults,
    questionResults,
    qualitative,
    respondents,
  };
}

type AssignmentWithResponse = {
  id: string;
  assigned_at: Date;
  respondent_id: string;
  respondent: { name: string };
  response: { id: string; status: string; submitted_at: Date | null } | null;
};

function buildAssignmentRespondentRow({
  assignment,
  identity,
  meanByResponse,
  stakeholder,
}: {
  assignment: AssignmentWithResponse;
  identity: RespondentIdentityContext | undefined;
  meanByResponse: Map<string, number | null>;
  stakeholder: TargetStakeholder;
}): ProgramHeadAssignmentRespondentRow {
  const status = resolveAssignmentStatus(assignment.response);
  const response = status === "SUBMITTED" ? assignment.response : null;
  const student = studentIdentityFields(identity);
  return {
    assignmentId: assignment.id,
    responseId: response?.id ?? null,
    name: assignment.respondent.name,
    stakeholder,
    status,
    majorLabel: student.majorLabel,
    yearLevel: student.yearLevel,
    section: student.section,
    assignedAt: assignment.assigned_at,
    submittedAt: response?.submitted_at ?? null,
    quantitativeMean: response ? (meanByResponse.get(response.id) ?? null) : null,
  };
}

function studentIdentityFields(
  identity: RespondentIdentityContext | undefined
): Pick<ProgramHeadAssignmentRespondentRow, "majorLabel" | "yearLevel" | "section"> {
  if (identity?.kind === "STUDENT") {
    return {
      majorLabel: identity.majorLabel,
      yearLevel: identity.yearLevel,
      section: identity.section,
    };
  }
  return { majorLabel: null, yearLevel: null, section: null };
}

function resolveAssignmentStatus(
  response: AssignmentWithResponse["response"]
): ProgramHeadAssignmentRespondentRow["status"] {
  if (response?.status === ResponseStatus.SUBMITTED) {
    return "SUBMITTED";
  }
  if (response?.status === ResponseStatus.IN_PROGRESS) {
    return "IN_PROGRESS";
  }
  return "NOT_STARTED";
}

function buildCentralRatingRows(
  submittedResponses: Array<{
    id: string;
    respondent_id: string;
    quant_items: Array<{ section_key: string; item_key: string; rating_value: number }>;
  }>,
  snapshot: unknown,
  snapshotItems: Map<string, { prompt: string }>,
  poByQuestionKey: Map<string, CentralPoRatingRow["poBindings"]>
): {
  ratingRows: OutcomeItemRatingRow[];
  centralGoRows: CentralPoRatingRow[];
  meanByResponse: Map<string, number | null>;
} {
  const ratingRows: OutcomeItemRatingRow[] = [];
  const centralGoRows: CentralPoRatingRow[] = [];
  const meanByResponse = new Map<string, number | null>();

  for (const response of submittedResponses) {
    const scaleKeys = new Set<string>();
    const validRatings = response.quant_items.flatMap((item) => {
      const scale = resolveItemScaleIdentity(snapshot, item.section_key, item.item_key);
      if (!scale || !scale.descriptors.some((d) => d.value === item.rating_value)) {
        return [];
      }
      scaleKeys.add(scale.key);
      const questionKey = encodeQuestionKey(item.section_key, item.item_key);
      const poBindings = poByQuestionKey.get(questionKey) ?? [];
      ratingRows.push({
        sectionKey: item.section_key,
        itemKey: item.item_key,
        prompt: snapshotItems.get(questionKey)?.prompt ?? item.item_key,
        ratingValue: item.rating_value,
        responseId: response.id,
        scale,
        cilo: null,
        poMappings: [],
      });
      centralGoRows.push({
        sectionKey: item.section_key,
        itemKey: item.item_key,
        ratingValue: item.rating_value,
        responseId: response.id,
        scale,
        poBindings,
      });
      return [item.rating_value];
    });
    meanByResponse.set(
      response.id,
      validRatings.length === 0 || scaleKeys.size > 1
        ? null
        : validRatings.reduce((sum, v) => sum + v, 0) / validRatings.length
    );
  }

  return { ratingRows, centralGoRows, meanByResponse };
}

function buildCentralIndexes(
  snapshot: unknown,
  poSnapshots: Array<{
    po_id: string | null;
    po_code_snapshot: string;
    po_description_snapshot: string;
    section_key: string;
    item_key: string;
  }>
): {
  snapshotItems: Map<string, { prompt: string }>;
  poByQuestionKey: Map<string, CentralPoRatingRow["poBindings"]>;
  poDisplayByQuestionKey: Map<string, ProgramWidePoBinding[]>;
} {
  const snapshotItems = new Map<string, { prompt: string }>();
  for (const section of Array.isArray(snapshot) ? snapshot.filter(isSnapshotSection) : []) {
    for (const item of getSnapshotSectionItems(section)) {
      snapshotItems.set(encodeQuestionKey(section.key, item.key), { prompt: item.prompt });
    }
  }
  const poByQuestionKey = new Map<string, CentralPoRatingRow["poBindings"]>();
  const poDisplayByQuestionKey = new Map<string, ProgramWidePoBinding[]>();
  for (const sb of poSnapshots) {
    const key = encodeQuestionKey(sb.section_key, sb.item_key);
    const entry = {
      poId: sb.po_id ?? sb.po_code_snapshot,
      poCode: sb.po_code_snapshot,
      poDescription: sb.po_description_snapshot,
    };
    const group = poByQuestionKey.get(key);
    if (group) {
      group.push(entry);
    } else {
      poByQuestionKey.set(key, [entry]);
    }
    const displayEntry: ProgramWidePoBinding = {
      key: sb.po_id ?? sb.po_code_snapshot,
      code: sb.po_code_snapshot,
      description: sb.po_description_snapshot,
    };
    const displayGroup = poDisplayByQuestionKey.get(key);
    if (displayGroup) {
      displayGroup.push(displayEntry);
    } else {
      poDisplayByQuestionKey.set(key, [displayEntry]);
    }
  }
  return { snapshotItems, poByQuestionKey, poDisplayByQuestionKey };
}
