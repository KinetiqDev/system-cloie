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
  buildProgramWidePloMetrics,
  type CentralPloRatingRow,
} from "@/features/analytics/aggregators/plo";
import { groupRatingsByScale } from "@/features/analytics/aggregators/quantitative";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
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
  ProgramWidePloBinding,
} from "../types";

// ---------------------------------------------------------------------------
// Program Head program-wide evaluation detail (spec §26)
//
// Direct PLO results come from CentralDeploymentPloSnapshot bindings (§5.9)
// grouped by plo_id ?? plo_code_snapshot; question results use the same
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
      plo_snapshots: true,
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
  const { snapshotItems, ploByQuestionKey, ploDisplayByQuestionKey } = buildCentralIndexes(
    snapshot,
    deployment.plo_snapshots
  );

  const { ratingRows, centralPloRows, meanByResponse } = buildCentralRatingRows(
    submittedResponses,
    snapshot,
    snapshotItems,
    ploByQuestionKey
  );

  const ploResults = buildProgramWidePloMetrics(centralPloRows);
  const questionResultsBase = buildQuestionMetrics(ratingRows);

  // Attach PLO bindings to question results
  const questionResults: ProgramHeadCentralQuestionResult[] = questionResultsBase.map((q) => ({
    ...q,
    ploBindings: ploDisplayByQuestionKey.get(`${q.sectionKey}|${q.itemKey}`) ?? [],
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
    ploResults,
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
  ploByQuestionKey: Map<string, CentralPloRatingRow["ploBindings"]>
): {
  ratingRows: OutcomeItemRatingRow[];
  centralPloRows: CentralPloRatingRow[];
  meanByResponse: Map<string, number | null>;
} {
  const ratingRows: OutcomeItemRatingRow[] = [];
  const centralPloRows: CentralPloRatingRow[] = [];
  const meanByResponse = new Map<string, number | null>();

  for (const response of submittedResponses) {
    const scaleKeys = new Set<string>();
    const validRatings = response.quant_items.flatMap((item) => {
      const scale = resolveItemScaleIdentity(snapshot, item.section_key, item.item_key);
      if (!scale || !scale.descriptors.some((d) => d.value === item.rating_value)) {
        return [];
      }
      scaleKeys.add(scale.key);
      const ploBindings = ploByQuestionKey.get(`${item.section_key}|${item.item_key}`) ?? [];
      ratingRows.push({
        sectionKey: item.section_key,
        itemKey: item.item_key,
        prompt: snapshotItems.get(`${item.section_key}|${item.item_key}`)?.prompt ?? item.item_key,
        ratingValue: item.rating_value,
        responseId: response.id,
        scale,
        cilo: null,
        ploMappings: [],
      });
      centralPloRows.push({
        sectionKey: item.section_key,
        itemKey: item.item_key,
        ratingValue: item.rating_value,
        responseId: response.id,
        scale,
        ploBindings,
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

  return { ratingRows, centralPloRows, meanByResponse };
}

function buildCentralIndexes(
  snapshot: unknown,
  ploSnapshots: Array<{
    plo_id: string | null;
    plo_code_snapshot: string;
    plo_description_snapshot: string;
    section_key: string;
    item_key: string;
  }>
): {
  snapshotItems: Map<string, { prompt: string }>;
  ploByQuestionKey: Map<string, CentralPloRatingRow["ploBindings"]>;
  ploDisplayByQuestionKey: Map<string, ProgramWidePloBinding[]>;
} {
  const snapshotItems = new Map<string, { prompt: string }>();
  for (const section of Array.isArray(snapshot) ? snapshot.filter(isSnapshotSection) : []) {
    for (const item of getSnapshotSectionItems(section)) {
      snapshotItems.set(`${section.key}|${item.key}`, { prompt: item.prompt });
    }
  }
  const ploByQuestionKey = new Map<string, CentralPloRatingRow["ploBindings"]>();
  const ploDisplayByQuestionKey = new Map<string, ProgramWidePloBinding[]>();
  for (const sb of ploSnapshots) {
    const key = `${sb.section_key}|${sb.item_key}`;
    const entry = {
      ploId: sb.plo_id ?? sb.plo_code_snapshot,
      ploCode: sb.plo_code_snapshot,
      ploDescription: sb.plo_description_snapshot,
    };
    const group = ploByQuestionKey.get(key);
    if (group) {
      group.push(entry);
    } else {
      ploByQuestionKey.set(key, [entry]);
    }
    const displayEntry: ProgramWidePloBinding = {
      key: sb.plo_id ?? sb.plo_code_snapshot,
      code: sb.plo_code_snapshot,
      description: sb.plo_description_snapshot,
    };
    const displayGroup = ploDisplayByQuestionKey.get(key);
    if (displayGroup) {
      displayGroup.push(displayEntry);
    } else {
      ploDisplayByQuestionKey.set(key, [displayEntry]);
    }
  }
  return { snapshotItems, ploByQuestionKey, ploDisplayByQuestionKey };
}
