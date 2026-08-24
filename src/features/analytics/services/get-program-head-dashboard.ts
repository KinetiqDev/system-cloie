import { AcademicSemester, DeploymentStatus, Prisma, ResponseStatus, TargetStakeholder } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
import {
  buildProgramHeadResponsesCourseEvaluationPath,
  buildProgramHeadResponsesPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";
import type { AnalyticsFilterState } from "./program-head-analytics-state";
import { buildAnalyticsUrl } from "./program-head-analytics-state";
import { buildProgramHeadResponsesUrl } from "./program-head-responses-state";
import {
  IMPOSSIBLE_TERM_INSTANCE_ID,
  buildPeriodLabel,
  buildProgramOpportunityScope,
  buildProgramResponseScope,
  resolveTermInstanceFilter,
} from "./get-program-head-analytics";
import { FEEDBACK_SOURCE_LABELS, buildRedactedWordCloudTokens } from "./qualitative-analytics";
import { buildParticipationSummary, type ParticipationRow } from "../aggregators/participation";
import { groupRatingsByScale } from "../aggregators/quantitative";
import { resolveItemScaleIdentity, type ScaleIdentity } from "../aggregators/scale-identity";
import {
  buildCourseDerivedPloMetrics,
  buildProgramWidePloMetrics,
  type CentralPloRatingRow,
  type PloMetric,
} from "../aggregators/plo";
import type { OutcomeItemRatingRow } from "../aggregators/cilo";
import type { ParticipationSummary } from "../aggregators/types";
import type { WordCloudToken } from "../types";

// ---------------------------------------------------------------------------
// Contracts (spec §13)
// ---------------------------------------------------------------------------

import {
  DASHBOARD_SOURCE_ORDER,
  QUALITATIVE_TOKEN_CAP,
  SOURCE_CARD_LABELS,
} from "../program-head-dashboard-labels";
export { QUALITATIVE_TOKEN_CAP };
import type { DashboardSourceKey } from "../program-head-dashboard-labels";

export type DashboardSourceMean = {
  sourceKey: DashboardSourceKey;
  label: string;
  /** Single compatible scale-group mean; null without evidence or mixed scales. */
  mean: number | null;
  ratingCount: number;
  spansMultipleScales: boolean;
  /** Max of the single compatible scale group; null when mixed scales. */
  scaleMax: number | null;
};

export type DashboardPloSummaryRow = {
  ploId: string;
  ploCode: string;
  /** Single compatible scale-group mean; null when mixed or without evidence. */
  mean: number | null;
  ratingCount: number;
  responseCount: number;
  evaluationCount: number;
  /** CILO count for course-derived evidence; bound question count otherwise (§13.8). */
  contributorCount: number;
  contributorKind: "cilos" | "questions";
  spansMultipleScales: boolean;
  /** Max of the single compatible scale; null when mixed scales or no evidence. */
  scaleMax: number | null;
  hasEvidence: boolean;
};

export type NeedsAttentionRule = "closing-soon" | "zero-submissions" | "zero-plo-ratings";

export type NeedsAttentionItem = {
  id: string;
  rule: NeedsAttentionRule;
  title: string;
  note: string | null;
  href: string;
};

export type QualitativePulse = {
  respondentCount: number;
  answerCount: number;
  evaluationCount: number;
  sourceCounts: Array<{ sourceKey: DashboardSourceKey; label: string; count: number }>;
  tokens: WordCloudToken[];
};

/** Cross-surface destinations every dashboard card links into (§13, §12). */
type DashboardLinks = {
  responses: string;
  responsesActiveCourse: string;
  responsesActiveProgramWide: string;
  analyticsOutcomes: string;
  analyticsStakeholders: string;
  analyticsFeedback: string;
};

/** Active live PLOs of the selected Program, for zero-evidence rows (§50). */
export type PloCatalogEntry = { id: string; code: string };

export type ProgramHeadDashboardData = {
  programLabel: string;
  programCode: string;
  periodLabel: string | null;
  participation: ParticipationSummary;
  /** In-progress + not-started assignments over the same raw rows as completion. */
  pendingResponses: number;
  activeEvaluations: { total: number; closingWithin7Days: number };
  sourceMeans: DashboardSourceMean[];
  ploSources: Record<DashboardSourceKey, DashboardPloSummaryRow[]>;
  ploCatalog: PloCatalogEntry[];
  needsAttention: NeedsAttentionItem[];
  qualitative: QualitativePulse;
  links: DashboardLinks;
};

type DashboardScope = {
  programId: string;
  programCode: string;
  programLabel: string;
};

/** Period filters shared with the Analytics URL state (§12 upward navigation). */
type DashboardPeriodFilters = Pick<
  AnalyticsFilterState,
  "schoolYearId" | "semester" | "termInstanceId"
>;

// ---------------------------------------------------------------------------
// Rating-row projection and pure shaping helpers
// ---------------------------------------------------------------------------

export type DashboardRatingRow = {
  rating_value: number;
  response_id: string;
  section_key: string;
  item_key: string;
  response: {
    assignment: {
      course_bound_id: string | null;
      course_bound: { id: string; instrument_version_id: string | null } | null;
      central_deployment: {
        id: string;
        target_stakeholder: TargetStakeholder;
        instrument_version_id: string;
      } | null;
    };
  };
};

function ratingRowSourceKey(row: DashboardRatingRow): DashboardSourceKey {
  if (row.response.assignment.course_bound) return "COURSE_STUDENT";
  const target = row.response.assignment.central_deployment?.target_stakeholder;
  if (target === TargetStakeholder.ALUMNI) return "ALUMNI";
  if (target === TargetStakeholder.INDUSTRY_PARTNER) return "INDUSTRY_PARTNER";
  return "CENTRAL_STUDENT";
}

function ratingRowScale(
  row: DashboardRatingRow,
  snapshotById: Map<string, unknown>
): ScaleIdentity | null {
  const versionId =
    row.response.assignment.course_bound?.instrument_version_id ??
    row.response.assignment.central_deployment?.instrument_version_id ??
    null;
  if (!versionId) return null;
  return resolveItemScaleIdentity(snapshotById.get(versionId) ?? null, row.section_key, row.item_key);
}

/**
 * Source-separated quantitative summary (§13.5): each source pools only its
 * own valid ratings per compatible scale identity (§9). A source spanning
 * incompatible scales reports `spansMultipleScales` instead of one invalid
 * combined mean; a source without evidence reports an unavailable mean.
 */
export function buildDashboardSourceMeans(
  rows: DashboardRatingRow[],
  snapshotById: Map<string, unknown>
): DashboardSourceMean[] {
  return DASHBOARD_SOURCE_ORDER.map((sourceKey) => {
    const groups = groupRatingsByScale(
      rows
        .filter((row) => ratingRowSourceKey(row) === sourceKey)
        .map((row) => ({
          rating: { value: row.rating_value, responseId: row.response_id },
          scale: ratingRowScale(row, snapshotById),
        }))
    );

    if (groups.length === 0 || (groups.length === 1 && groups[0].metric.ratingCount === 0)) {
      return {
        sourceKey,
        label: SOURCE_CARD_LABELS[sourceKey],
        mean: null,
        ratingCount: 0,
        spansMultipleScales: false,
        scaleMax: null,
      };
    }

    if (groups.length > 1) {
      return {
        sourceKey,
        label: SOURCE_CARD_LABELS[sourceKey],
        mean: null,
        ratingCount: groups.reduce((sum, group) => sum + group.metric.ratingCount, 0),
        spansMultipleScales: true,
        scaleMax: null,
      };
    }

    return {
      sourceKey,
      label: SOURCE_CARD_LABELS[sourceKey],
      mean: groups[0].metric.mean,
      ratingCount: groups[0].metric.ratingCount,
      spansMultipleScales: false,
      scaleMax: groups[0].scale?.max ?? null,
    };
  });
}

/** Project course-derived PLO metrics into the compact summary row shape (§13.8). */
export function toDashboardPloRows(metrics: PloMetric[]): DashboardPloSummaryRow[] {
  return metrics.map((metric) => ({
    ploId: metric.ploId,
    ploCode: metric.ploCode,
    mean: metric.mean,
    ratingCount: metric.ratingCount,
    responseCount: metric.responseCount,
    evaluationCount: metric.evaluationCount,
    contributorCount: metric.contributingCilos.length,
    contributorKind: "cilos" as const,
    spansMultipleScales: metric.spansMultipleScales,
    scaleMax: singleScaleMax(metric),
    hasEvidence: metric.ratingCount > 0,
  }));
}

/** Max of the single compatible scale group; null when mixed or unresolved. */
function singleScaleMax(metric: PloMetric): number | null {
  if (metric.scaleGroups.length !== 1) return null;
  return metric.scaleGroups[0].scale?.max ?? null;
}

/** Project program-wide PLO metrics into the compact summary row shape (§13.8). */
export function toCentralDashboardPloRows(metrics: PloMetric[]): DashboardPloSummaryRow[] {
  return metrics.map((metric) => ({
    ploId: metric.ploId,
    ploCode: metric.ploCode,
    mean: metric.mean,
    ratingCount: metric.ratingCount,
    responseCount: metric.responseCount,
    evaluationCount: metric.evaluationCount,
    contributorCount: metric.questionCount,
    contributorKind: "questions" as const,
    spansMultipleScales: metric.spansMultipleScales,
    scaleMax: singleScaleMax(metric),
    hasEvidence: metric.ratingCount > 0,
  }));
}

/** Publication-time CILO question binding joined with its selected-Program mappings. */
export type CourseBindingRow = {
  course_bound_evaluation_id: string;
  section_key: string;
  item_key: string;
  cilo: {
    id: string;
    description: string;
    cilo_mappings: Array<{
      manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY";
      plo: { id: string; code: string; description: string };
    }>;
  } | null;
};

/**
 * Normalize course-bound ratings into shared-aggregator rows through their
 * publication-time binding (evaluation + section/item key identity). Items
 * without a live binding or without selected-Program mappings never create
 * PLO evidence (§6.5); manifestations stay descriptive labels (§7).
 */
export function buildCoursePloRatingRows(
  rows: DashboardRatingRow[],
  bindingByKey: Map<string, CourseBindingRow>,
  snapshotById: Map<string, unknown>
): OutcomeItemRatingRow[] {
  const normalized: OutcomeItemRatingRow[] = [];
  for (const row of rows) {
    const courseBoundId = row.response.assignment.course_bound_id;
    if (!courseBoundId) continue;
    const binding = bindingByKey.get(`${courseBoundId}:${row.section_key}:${row.item_key}`);
    const cilo = binding?.cilo;
    if (!cilo || cilo.cilo_mappings.length === 0) continue;
    normalized.push({
      sectionKey: row.section_key,
      itemKey: row.item_key,
      prompt: "",
      ratingValue: row.rating_value,
      responseId: row.response_id,
      evaluationId: courseBoundId,
      scale: ratingRowScale(row, snapshotById),
      cilo: { id: cilo.id, label: cilo.description, description: cilo.description },
      ploMappings: cilo.cilo_mappings.map((mapping) => ({
        ploId: mapping.plo.id,
        ploCode: mapping.plo.code,
        ploDescription: mapping.plo.description,
        manifestation: mapping.manifestation,
      })),
    });
  }
  return normalized;
}

/** Snapshot PLO bindings keyed by deployment then section/item identity. */
export type CentralBindingsByDeployment = Map<
  string,
  Map<string, Array<{ ploId: string; ploCode: string; ploDescription: string }>>
>;

/**
 * Normalize central-deployment ratings into shared-aggregator rows through
 * the published CentralDeploymentPloSnapshot bindings (§5.9). Questions the
 * deployment never bound to a live PLO contribute no PLO evidence.
 */
export function buildCentralPloRatingRows(
  rows: DashboardRatingRow[],
  bindingsByDeployment: CentralBindingsByDeployment,
  snapshotById: Map<string, unknown>
): CentralPloRatingRow[] {
  const normalized: CentralPloRatingRow[] = [];
  for (const row of rows) {
    const deployment = row.response.assignment.central_deployment;
    if (!deployment) continue;
    const bindings = bindingsByDeployment
      .get(deployment.id)
      ?.get(`${row.section_key}:${row.item_key}`);
    if (!bindings || bindings.length === 0) continue;
    normalized.push({
      sectionKey: row.section_key,
      itemKey: row.item_key,
      ratingValue: row.rating_value,
      responseId: row.response_id,
      evaluationId: deployment.id,
      scale: ratingRowScale(row, snapshotById),
      ploBindings: bindings,
    });
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Needs attention (§13.9 — exactly the three resolved rules)
// ---------------------------------------------------------------------------

export type AttentionDeployment = {
  id: string;
  kind: "course" | "central";
  name: string;
  status: DeploymentStatus;
  deadlineAt: Date | null;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Rule 1 predicate: ACTIVE with a deadline inside the next seven days (or already due). */
export function isClosingWithinSevenDays(deployment: AttentionDeployment, now: Date): boolean {
  return (
    deployment.status === DeploymentStatus.ACTIVE &&
    deployment.deadlineAt !== null &&
    deployment.deadlineAt.getTime() <= now.getTime() + SEVEN_DAYS_MS
  );
}

/**
 * The three concrete needs-attention rules, period-scoped to the selected
 * Program: an ACTIVE deployment whose deadline is within 7 days, an ACTIVE
 * deployment with zero submitted responses, and a live PLO with zero ratings
 * for an evidence source. Operational facts only — no attainment or
 * performance classification (resolved §13.9).
 */
export function buildNeedsAttentionItems(input: {
  programId: string;
  now: Date;
  deployments: AttentionDeployment[];
  submittedCountsByDeployment: Map<string, number>;
  programPlos: Array<{ id: string; code: string }>;
  ploRowsBySource: Partial<Record<DashboardSourceKey, DashboardPloSummaryRow[]>>;
  analyticsOutcomesHref: string;
}): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];
  const activeDeployments = input.deployments.filter(
    (deployment) => deployment.status === DeploymentStatus.ACTIVE
  );

  for (const deployment of activeDeployments) {
    if (!isClosingWithinSevenDays(deployment, input.now)) continue;
    items.push({
      id: `closing-soon:${deployment.kind}:${deployment.id}`,
      rule: "closing-soon",
      title: `${deployment.name} closes soon`,
      note: "Deadline within 7 days",
      href:
        deployment.kind === "course"
          ? buildProgramHeadResponsesCourseEvaluationPath(input.programId, deployment.id)
          : buildProgramHeadResponsesProgramWideDeploymentPath(input.programId, deployment.id),
    });
  }

  for (const deployment of activeDeployments) {
    if ((input.submittedCountsByDeployment.get(deployment.id) ?? 0) > 0) continue;
    items.push({
      id: `zero-submissions:${deployment.kind}:${deployment.id}`,
      rule: "zero-submissions",
      title: `${deployment.name} has no submissions yet`,
      note: "No submitted responses so far",
      href:
        deployment.kind === "course"
          ? buildProgramHeadResponsesCourseEvaluationPath(input.programId, deployment.id)
          : buildProgramHeadResponsesProgramWideDeploymentPath(input.programId, deployment.id),
    });
  }

  for (const sourceKey of DASHBOARD_SOURCE_ORDER) {
    const evidencePloIds = new Set(
      (input.ploRowsBySource[sourceKey] ?? [])
        .filter((row) => row.hasEvidence)
        .map((row) => row.ploId)
    );
    for (const plo of input.programPlos) {
      if (evidencePloIds.has(plo.id)) continue;
      items.push({
        id: `zero-plo-ratings:${sourceKey}:${plo.id}`,
        rule: "zero-plo-ratings",
        title: `${plo.code} has no ratings yet`,
        note: `No ${SOURCE_CARD_LABELS[sourceKey]} ratings in this period`,
        href: input.analyticsOutcomesHref,
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Qualitative pulse (§13.10)
// ---------------------------------------------------------------------------

type QualitativeRow = {
  text_content: string;
  response: {
    id: string;
    respondent_id: string;
    assignment: {
      course_bound: { id: string } | null;
      central_deployment: { id: string; target_stakeholder: TargetStakeholder } | null;
    };
  };
};

/**
 * Aggregate the qualitative pulse counts over non-empty submitted answers.
 * Tokens are identifier-redacted server-side and capped at
 * QUALITATIVE_TOKEN_CAP (§13.10).
 */
export function summarizeQualitativePulse(rows: QualitativeRow[]): QualitativePulse {
  const contributing = rows.filter((row) => row.text_content.trim().length > 0);
  // Person-level respondent count across every deployment kind (§13.3): one
  // person answering several evaluations counts once.
  const respondentIds = new Set<string>();
  const evaluationIds = new Set<string>();
  const sourceBuckets = new Map<DashboardSourceKey, number>();

  for (const row of contributing) {
    respondentIds.add(row.response.respondent_id);
    const courseBound = row.response.assignment.course_bound;
    const central = row.response.assignment.central_deployment;
    if (courseBound) {
      evaluationIds.add(courseBound.id);
    } else if (central) {
      evaluationIds.add(central.id);
    }
    const sourceKey: DashboardSourceKey = courseBound
      ? "COURSE_STUDENT"
      : central?.target_stakeholder === TargetStakeholder.ALUMNI
        ? "ALUMNI"
        : central?.target_stakeholder === TargetStakeholder.INDUSTRY_PARTNER
          ? "INDUSTRY_PARTNER"
          : "CENTRAL_STUDENT";
    sourceBuckets.set(sourceKey, (sourceBuckets.get(sourceKey) ?? 0) + 1);
  }

  return {
    respondentCount: respondentIds.size,
    answerCount: contributing.length,
    evaluationCount: evaluationIds.size,
    sourceCounts: DASHBOARD_SOURCE_ORDER.flatMap((sourceKey) =>
      sourceBuckets.has(sourceKey)
        ? [
            {
              sourceKey,
              label: FEEDBACK_SOURCE_LABELS[sourceKey],
              count: sourceBuckets.get(sourceKey)!,
            },
          ]
        : []
    ),
    tokens: buildRedactedWordCloudTokens(
      contributing.map((row) => row.text_content)
    ).slice(0, QUALITATIVE_TOKEN_CAP),
  };
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getProgramHeadDashboard(
  programId: string,
  periodFilters: DashboardPeriodFilters = {}
): Promise<ProgramHeadDashboardData | null> {
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    return null;
  }

  const scope: DashboardScope = {
    programId: contextResult.data.selectedProgram.id,
    programCode: contextResult.data.selectedProgram.code,
    programLabel: contextResult.data.selectedProgram.name,
  };

  // Default every metric to the active academic period (§13.1); explicit
  // Analytics-compatible period filters win over the default.
  let effectiveFilters: DashboardPeriodFilters = periodFilters;
  if (
    !periodFilters.schoolYearId &&
    !periodFilters.semester &&
    !periodFilters.termInstanceId
  ) {
    const activeTermId = await getActiveTermId();
    if (activeTermId) {
      effectiveFilters = { termInstanceId: activeTermId };
    }
  }

  const { where: termInstanceWhere, schoolYearLabel } = await resolveTermInstanceFilter(
    scope.programId,
    effectiveFilters
  );
  const activeEvaluations = await listActiveEvaluations(scope.programId, termInstanceWhere);

  const periodLabel = buildPeriodLabel(
    effectiveFilters,
    schoolYearLabel,
    termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID
  );

  const programResponseScope = buildProgramResponseScope(scope.programId, termInstanceWhere);
  const programOpportunityScope = buildProgramOpportunityScope(scope.programId, termInstanceWhere);

  const [participationRows, ratingRows, qualitativeRows, programPlos] = await Promise.all([
    // One row per in-scope EvaluationAssignment: the canonical raw denominator
    // (resolved §5.12) feeding completion, respondents, and stakeholder bars.
    prisma.evaluationAssignment.findMany({
      where: programOpportunityScope,
      select: {
        respondent_id: true,
        central_deployment: { select: { target_stakeholder: true } },
        response: { select: { status: true } },
      },
    }),
    prisma.quantitativeResponseItem.findMany({
      where: { response: { status: ResponseStatus.SUBMITTED, ...programResponseScope } },
      select: {
        rating_value: true,
        response_id: true,
        section_key: true,
        item_key: true,
        response: {
          select: {
            assignment: {
              select: {
                course_bound_id: true,
                course_bound: { select: { id: true, instrument_version_id: true } },
                central_deployment: {
                  select: { id: true, target_stakeholder: true, instrument_version_id: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.qualitativeResponseItem.findMany({
      where: { response: { status: ResponseStatus.SUBMITTED, ...programResponseScope } },
      select: {
        text_content: true,
        response: {
          select: {
            id: true,
            respondent_id: true,
            assignment: {
              select: {
                course_bound: { select: { id: true } },
                central_deployment: { select: { id: true, target_stakeholder: true } },
              },
            },
          },
        },
      },
    }),
    prisma.pLO.findMany({
      where: { program_id: scope.programId, is_active: true },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const participation = buildParticipationSummary(
    participationRows.map(
      (row): ParticipationRow => ({
        respondentId: row.respondent_id,
        stakeholder: row.central_deployment?.target_stakeholder ?? TargetStakeholder.STUDENT,
        responseStatus: row.response?.status ?? null,
      })
    )
  );

  const snapshotById = await loadInstrumentSnapshots(ratingRows);

  // ── Source-separated quantitative results (§13.5) ────────────────────────

  const sourceMeans = buildDashboardSourceMeans(ratingRows, snapshotById);

  // ── PLO evidence per source (§13.8) ──────────────────────────────────────

  const courseBoundRows = ratingRows.filter((row) => row.response.assignment.course_bound);
  const centralRows = ratingRows.filter((row) => !row.response.assignment.course_bound);

  const [bindingByKey, centralBindings] = await Promise.all([
    loadCourseBindings(courseBoundRows, scope.programId),
    loadCentralPloBindings(centralRows),
  ]);

  const ploRowsBySource: Record<DashboardSourceKey, DashboardPloSummaryRow[]> = {
    COURSE_STUDENT: toDashboardPloRows(
      buildCourseDerivedPloMetrics(
        buildCoursePloRatingRows(courseBoundRows, bindingByKey, snapshotById)
      )
    ),
    CENTRAL_STUDENT: [],
    ALUMNI: [],
    INDUSTRY_PARTNER: [],
  };

  const centralBySource = new Map<DashboardSourceKey, DashboardRatingRow[]>();
  for (const row of centralRows) {
    const sourceKey = ratingRowSourceKey(row);
    const bucket = centralBySource.get(sourceKey) ?? [];
    bucket.push(row);
    centralBySource.set(sourceKey, bucket);
  }
  for (const sourceKey of ["CENTRAL_STUDENT", "ALUMNI", "INDUSTRY_PARTNER"] as const) {
    ploRowsBySource[sourceKey] = toCentralDashboardPloRows(
      buildProgramWidePloMetrics(
        buildCentralPloRatingRows(centralBySource.get(sourceKey) ?? [], centralBindings, snapshotById)
      )
    );
  }

  // ── Active evaluations KPI + needs-attention inputs (§13.4, §13.9) ───────

  const now = new Date();
  const candidateIds = activeEvaluations.deployments.map((deployment) => deployment.id);
  const submissionGroups =
    candidateIds.length > 0
      ? await prisma.response.groupBy({
          by: ["deployment_id"],
          _count: { _all: true },
          where: { status: ResponseStatus.SUBMITTED, deployment_id: { in: candidateIds } },
        })
      : [];
  const submittedCountsByDeployment = new Map(
    submissionGroups.map((group) => [group.deployment_id, group._count._all])
  );

  const analyticsOutcomesHref = buildAnalyticsUrl(scope.programId, {
    ...effectiveFilters,
    tab: "outcomes",
  });

  const needsAttention = buildNeedsAttentionItems({
    programId: scope.programId,
    now,
    deployments: activeEvaluations.deployments,
    submittedCountsByDeployment,
    programPlos,
    ploRowsBySource,
    analyticsOutcomesHref,
  });

  return {
    programLabel: scope.programLabel,
    programCode: scope.programCode,
    periodLabel,
    participation,
    pendingResponses: participation.inProgress + participation.notStarted,
    activeEvaluations: {
      total: activeEvaluations.deployments.length,
      closingWithin7Days: activeEvaluations.deployments.filter((deployment) =>
        isClosingWithinSevenDays(deployment, now)
      ).length,
    },
    sourceMeans,
    ploSources: ploRowsBySource,
    ploCatalog: programPlos.map((plo) => ({ id: plo.id, code: plo.code })),
    needsAttention,
    qualitative: summarizeQualitativePulse(qualitativeRows),
    links: buildDashboardLinks(scope.programId, effectiveFilters),
  };
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

async function listActiveEvaluations(
  programId: string,
  termInstanceWhere: Record<string, unknown>
): Promise<{ deployments: AttentionDeployment[] }> {
  const termFilter = termInstanceWhere as Prisma.AcademicTermInstanceWhereInput;
  const [central, courseBound] = await Promise.all([
    prisma.centralDeployment.findMany({
      where: {
        program_id: programId,
        status: DeploymentStatus.ACTIVE,
        term_instance: termFilter,
      },
      select: { id: true, deployment_name: true, status: true, deadline_at: true },
    }),
    prisma.courseBoundEvaluation.findMany({
      where: {
        course_assignment: { program_id: programId },
        status: DeploymentStatus.ACTIVE,
        term_instance: termFilter,
      },
      select: { id: true, deployment_name: true, status: true, deadline_at: true },
    }),
  ]);

  return {
    deployments: [
      ...central.map(
        (deployment): AttentionDeployment => ({
          id: deployment.id,
          kind: "central",
          name: deployment.deployment_name,
          status: deployment.status,
          deadlineAt: deployment.deadline_at,
        })
      ),
      ...courseBound.map(
        (deployment): AttentionDeployment => ({
          id: deployment.id,
          kind: "course",
          name: deployment.deployment_name,
          status: deployment.status,
          deadlineAt: deployment.deadline_at,
        })
      ),
    ],
  };
}

async function loadInstrumentSnapshots(
  ratingRows: DashboardRatingRow[]
): Promise<Map<string, unknown>> {
  const versionIds = [
    ...new Set(
      ratingRows.flatMap((row) => {
        const versionId =
          row.response.assignment.course_bound?.instrument_version_id ??
          row.response.assignment.central_deployment?.instrument_version_id ??
          null;
        return versionId ? [versionId] : [];
      })
    ),
  ];
  if (versionIds.length === 0) {
    return new Map();
  }
  const versions = await prisma.instrumentVersion.findMany({
    where: { id: { in: versionIds } },
    select: { id: true, structure_snapshot: true },
  });
  return new Map(versions.map((version) => [version.id, version.structure_snapshot]));
}

/**
 * Publication-time CILO question bindings resolved by evaluation plus
 * section/item keys — the same identity the student submission flow writes
 * ratings under (mirrors the Analytics outcomes read).
 */
async function loadCourseBindings(
  courseBoundRows: DashboardRatingRow[],
  programId: string
): Promise<Map<string, CourseBindingRow>> {
  const evaluationIds = [
    ...new Set(
      courseBoundRows.flatMap((row) =>
        row.response.assignment.course_bound_id ? [row.response.assignment.course_bound_id] : []
      )
    ),
  ];
  if (evaluationIds.length === 0) {
    return new Map();
  }
  const bindings = await prisma.courseBoundCiloQuestionBinding.findMany({
    where: {
      course_bound_evaluation_id: { in: evaluationIds },
      cilo_id: { not: null },
    },
    select: {
      course_bound_evaluation_id: true,
      section_key: true,
      item_key: true,
      cilo: {
        select: {
          id: true,
          description: true,
          cilo_mappings: {
            where: { plo: { program_id: programId } },
            select: {
              manifestation: true,
              plo: { select: { id: true, code: true, description: true } },
            },
          },
        },
      },
    },
  });
  return new Map(
    bindings.map((binding) => [
      `${binding.course_bound_evaluation_id}:${binding.section_key}:${binding.item_key}`,
      binding as CourseBindingRow,
    ])
  );
}

async function loadCentralPloBindings(
  centralRows: DashboardRatingRow[]
): Promise<CentralBindingsByDeployment> {
  const deploymentIds = [
    ...new Set(
      centralRows.flatMap((row) =>
        row.response.assignment.central_deployment
          ? [row.response.assignment.central_deployment.id]
          : []
      )
    ),
  ];
  if (deploymentIds.length === 0) {
    return new Map();
  }
  const snapshots = await prisma.centralDeploymentPloSnapshot.findMany({
    where: { central_deployment_id: { in: deploymentIds }, plo_id: { not: null } },
    select: {
      central_deployment_id: true,
      section_key: true,
      item_key: true,
      plo: { select: { id: true, code: true, description: true } },
    },
  });
  const byDeployment: CentralBindingsByDeployment = new Map();
  for (const snapshot of snapshots) {
    let byQuestion = byDeployment.get(snapshot.central_deployment_id);
    if (!byQuestion) {
      byQuestion = new Map();
      byDeployment.set(snapshot.central_deployment_id, byQuestion);
    }
    const questionKey = `${snapshot.section_key}:${snapshot.item_key}`;
    const bindings = byQuestion.get(questionKey) ?? [];
    bindings.push({
      ploId: snapshot.plo!.id,
      ploCode: snapshot.plo!.code,
      ploDescription: snapshot.plo!.description,
    });
    byQuestion.set(questionKey, bindings);
  }
  return byDeployment;
}

function buildDashboardLinks(
  programId: string,
  filters: DashboardPeriodFilters
): DashboardLinks {
  return {
    responses: buildProgramHeadResponsesPath(programId),
    responsesActiveCourse: buildProgramHeadResponsesUrl(programId, {
      schoolYearId: filters.schoolYearId,
      semester: filters.semester as AcademicSemester | undefined,
      termInstanceId: filters.termInstanceId,
      tab: "course",
      page: 1,
      status: DeploymentStatus.ACTIVE,
    }),
    responsesActiveProgramWide: buildProgramHeadResponsesUrl(programId, {
      schoolYearId: filters.schoolYearId,
      semester: filters.semester as AcademicSemester | undefined,
      termInstanceId: filters.termInstanceId,
      tab: "program-wide",
      page: 1,
      status: DeploymentStatus.ACTIVE,
    }),
    analyticsOutcomes: buildAnalyticsUrl(programId, { ...filters, tab: "outcomes" }),
    analyticsStakeholders: buildAnalyticsUrl(programId, { ...filters, tab: "stakeholders" }),
    analyticsFeedback: buildAnalyticsUrl(programId, { ...filters, tab: "feedback" }),
  };
}
