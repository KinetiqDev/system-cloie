import { DeploymentStatus, ResponseStatus, TargetStakeholder } from "@prisma/client";
import type { AcademicSemester } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  buildProgramHeadResponsesCourseEvaluationPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";
import type { AnalyticsFilterState } from "./program-head-analytics-state";
import { buildAnalyticsUrl } from "./program-head-analytics-state";
import {
  buildProgramHeadResponsesUrl,
  programHeadResponsesQuery,
} from "./program-head-responses-state";
import {
  buildProgramOpportunityScope,
  buildProgramResponseScope,
  resolveTermInstanceFilter,
} from "./get-program-head-analytics";
import { buildInstancePeriodLabel, buildPeriodLabel } from "./academic-periods";
import {
  getActiveTermId,
  resolveActiveTerm,
} from "@/features/academic-calendar/services/resolve-active-term";
import { buildRedactedWordCloudTokens } from "./qualitative-analytics";
import { buildParticipationSummary, type ParticipationRow } from "../aggregators/participation";
import { resolveItemScaleIdentity, type ScaleIdentity } from "../aggregators/scale-identity";
import {
  buildCourseDerivedPoMetrics,
  buildProgramWidePoMetrics,
  type CentralPoRatingRow,
  type PoMetric,
} from "../aggregators/po";
import type { OutcomeItemRatingRow } from "../aggregators/cilo";
import {
  encodeBindingKey as encodeCourseBindingKey,
  encodeQuestionKey,
} from "../aggregators/question-identity";
import type { ParticipationSummary } from "../aggregators/types";
import type { OutcomeAttainment } from "../aggregators/outcome-attainment";
import { classifyOutcomeMean } from "../aggregators/outcome-attainment";
import type { WordCloudToken } from "../types";

// ---------------------------------------------------------------------------
// Contracts (spec §13)
// ---------------------------------------------------------------------------

import {
  DASHBOARD_SOURCE_ORDER,
  DASHBOARD_SOURCE_TO_ANALYTICS_FILTER,
  QUALITATIVE_TOKEN_CAP,
  SOURCE_CARD_LABELS,
} from "../program-head-dashboard-labels";
export { QUALITATIVE_TOKEN_CAP };
import type { DashboardSourceKey } from "../program-head-dashboard-labels";

/** One PO's mean for one evidence source; rows link into Analytics > Outcomes (§13.8). */
export type DashboardPoRow = {
  poId: string;
  poCode: string;
  /** Single compatible scale-group mean; null when mixed or without evidence. */
  mean: number | null;
  spansMultipleScales: boolean;
  /** Max of the single compatible scale; null when mixed scales or no evidence. */
  scaleMax: number | null;
  hasEvidence: boolean;
  /** Deterministic CLOIE_OUTCOME_MEAN_V1 interpretation for this PO mean. */
  attainment: OutcomeAttainment;
};

export type NeedsAttentionRule = "closing-soon" | "zero-submissions" | "zero-po-ratings";

/**
 * One actionable line: a deployment carries every rule it trips, and PO
 * rating gaps collapse into one item per evidence source.
 */
export type NeedsAttentionItem = {
  id: string;
  rules: NeedsAttentionRule[];
  title: string;
  note: string;
  href: string;
};

export type QualitativePulse = {
  respondentCount: number;
  answerCount: number;
  tokens: WordCloudToken[];
};

/** Cross-surface destinations the dashboard links into (§13, §12). */
type DashboardLinks = {
  responses: string;
  responsesActiveCourse: string;
  analyticsOutcomes: string;
  analyticsStakeholders: string;
  analyticsFeedback: string;
};

/** Active live POs of the selected Program, for zero-evidence rows (§50). */
export type PoCatalogEntry = { id: string; code: string };

export type ProgramHeadDashboardData = {
  programLabel: string;
  programCode: string;
  periodLabel: string | null;
  participation: ParticipationSummary;
  activeEvaluations: { total: number; closingWithin7Days: number };
  poSources: Record<DashboardSourceKey, DashboardPoRow[]>;
  poCatalog: PoCatalogEntry[];
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
export type DashboardPeriodFilters = Pick<
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
  return resolveItemScaleIdentity(
    snapshotById.get(versionId) ?? null,
    row.section_key,
    row.item_key
  );
}

/** Project PO metrics into the dashboard row shape (§13.8). */
export function toDashboardPoRows(metrics: PoMetric[]): DashboardPoRow[] {
  return metrics.map((metric) => ({
    poId: metric.poId,
    poCode: metric.poCode,
    mean: metric.mean,
    spansMultipleScales: metric.spansMultipleScales,
    scaleMax: metric.scaleGroups.length === 1 ? (metric.scaleGroups[0].scale?.max ?? null) : null,
    hasEvidence: metric.ratingCount > 0,
    attainment: classifyOutcomeMean(
      metric.mean,
      metric.scaleGroups.length === 1 ? metric.scaleGroups[0].scale : null,
      { spansMultipleScales: metric.spansMultipleScales }
    ),
  }));
}

/** Course question bindings keyed by evaluation plus section/item identity. */
export type CourseBindingRow = {
  course_bound_evaluation_id: string;
  section_key: string;
  item_key: string;
  cilo: {
    id: string;
    description: string;
    cilo_mappings: Array<{
      manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
      po: { id: string; code: string; description: string };
    }>;
  } | null;
  directPoMappings?: Array<{
    poId: string;
    poCode: string;
    poDescription: string;
  }>;
};

/** Normalize course-bound ratings through CILO and direct PO bindings. */
export function buildCourseGoRatingRows(
  rows: DashboardRatingRow[],
  bindingByKey: Map<string, CourseBindingRow>,
  snapshotById: Map<string, unknown>
): OutcomeItemRatingRow[] {
  const normalized: OutcomeItemRatingRow[] = [];
  for (const row of rows) {
    const courseBoundId = row.response.assignment.course_bound_id;
    if (!courseBoundId) continue;
    const binding = bindingByKey.get(
      encodeCourseBindingKey(courseBoundId, row.section_key, row.item_key)
    );
    const cilo = binding?.cilo;
    const directPoMappings = binding?.directPoMappings ?? [];
    if ((!cilo || cilo.cilo_mappings.length === 0) && directPoMappings.length === 0) continue;
    normalized.push({
      sectionKey: row.section_key,
      itemKey: row.item_key,
      prompt: "",
      ratingValue: row.rating_value,
      responseId: row.response_id,
      evaluationId: courseBoundId,
      scale: ratingRowScale(row, snapshotById),
      cilo: cilo ? { id: cilo.id, label: cilo.description, description: cilo.description } : null,
      poMappings:
        cilo?.cilo_mappings.map((mapping) => ({
          poId: mapping.po.id,
          poCode: mapping.po.code,
          poDescription: mapping.po.description,
          manifestation: mapping.manifestation,
        })) ?? [],
      directPoMappings: directPoMappings.map((mapping) => ({
        ...mapping,
        manifestation: null,
      })),
    });
  }
  return normalized;
}

/** Snapshot PO bindings keyed by deployment then section/item identity. */
export type CentralBindingsByDeployment = Map<
  string,
  Map<string, Array<{ poId: string; poCode: string; poDescription: string }>>
>;

/**
 * Normalize central-deployment ratings into shared-aggregator rows through
 * the published CentralDeploymentPoSnapshot bindings (§5.9). Questions the
 * deployment never bound to a live PO contribute no PO evidence.
 */
export function buildCentralPoRatingRows(
  rows: DashboardRatingRow[],
  bindingsByDeployment: CentralBindingsByDeployment,
  snapshotById: Map<string, unknown>
): CentralPoRatingRow[] {
  const normalized: CentralPoRatingRow[] = [];
  for (const row of rows) {
    const deployment = row.response.assignment.central_deployment;
    if (!deployment) continue;
    const bindings = bindingsByDeployment
      .get(deployment.id)
      ?.get(encodeQuestionKey(row.section_key, row.item_key));
    if (!bindings || bindings.length === 0) continue;
    normalized.push({
      sectionKey: row.section_key,
      itemKey: row.item_key,
      ratingValue: row.rating_value,
      responseId: row.response_id,
      evaluationId: deployment.id,
      scale: ratingRowScale(row, snapshotById),
      poBindings: bindings,
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
 * deployment with zero submitted responses, and a live PO with zero ratings
 * for an evidence source. Operational facts only — no attainment or
 * performance classification (resolved §13.9). A deployment tripping both
 * deployment rules is one item; PO gaps collapse into one item per source.
 */
export function buildNeedsAttentionItems(input: {
  programId: string;
  now: Date;
  deployments: AttentionDeployment[];
  submittedCountsByDeployment: Map<string, number>;
  programGos: Array<{ id: string; code: string }>;
  poRowsBySource: Partial<Record<DashboardSourceKey, DashboardPoRow[]>>;
  periodFilters?: DashboardPeriodFilters;
}): NeedsAttentionItem[] {
  const deploymentItems = input.deployments
    .filter((deployment) => deployment.status === DeploymentStatus.ACTIVE)
    .map((deployment) => {
      const rules: NeedsAttentionRule[] = [];
      if (isClosingWithinSevenDays(deployment, input.now)) rules.push("closing-soon");
      if ((input.submittedCountsByDeployment.get(deployment.id) ?? 0) === 0) {
        rules.push("zero-submissions");
      }
      return { deployment, rules };
    })
    .filter(({ rules }) => rules.length > 0)
    .sort(
      (a, b) =>
        Number(b.rules.includes("closing-soon")) - Number(a.rules.includes("closing-soon")) ||
        (a.deployment.deadlineAt?.getTime() ?? Infinity) -
          (b.deployment.deadlineAt?.getTime() ?? Infinity) ||
        // Deadline ties are broken by name, not by database row order: equal
        // deadlines are common in seeded demo scopes, and an unordered read
        // makes the ranked list differ between deployments.
        a.deployment.name.localeCompare(b.deployment.name)
    )
    .map(
      ({ deployment, rules }): NeedsAttentionItem => ({
        id: `deployment:${deployment.kind}:${deployment.id}`,
        rules,
        title: deployment.name,
        note: rules
          .map((rule) => (rule === "closing-soon" ? "Closes within 7 days" : "No submissions yet"))
          .join(" · "),
        href: buildAttentionDeploymentHref(input.programId, deployment, input.periodFilters),
      })
    );

  const poGapItems = DASHBOARD_SOURCE_ORDER.flatMap((sourceKey): NeedsAttentionItem[] => {
    const evidencePoIds = new Set(
      (input.poRowsBySource[sourceKey] ?? [])
        .filter((row) => row.hasEvidence)
        .map((row) => row.poId)
    );
    const missing = input.programGos.filter((po) => !evidencePoIds.has(po.id));
    if (missing.length === 0) return [];
    return [
      {
        id: `zero-po-ratings:${sourceKey}`,
        rules: ["zero-po-ratings"],
        title: `No ratings from ${SOURCE_CARD_LABELS[sourceKey]}`,
        note:
          missing.length === input.programGos.length && missing.length > 1
            ? `All ${missing.length} POs`
            : missing.map((po) => po.code).join(", "),
        href: buildAnalyticsUrl(input.programId, {
          ...input.periodFilters,
          tab: "outcomes",
          ...DASHBOARD_SOURCE_TO_ANALYTICS_FILTER[sourceKey],
        }),
      },
    ];
  });

  return [...deploymentItems, ...poGapItems];
}

function buildAttentionDeploymentHref(
  programId: string,
  deployment: AttentionDeployment,
  filters: DashboardPeriodFilters = {}
): string {
  const path =
    deployment.kind === "course"
      ? buildProgramHeadResponsesCourseEvaluationPath(programId, deployment.id)
      : buildProgramHeadResponsesProgramWideDeploymentPath(programId, deployment.id);
  const query = programHeadResponsesQuery({
    tab: deployment.kind === "course" ? "course" : "program-wide",
    page: 1,
    termInstanceId: filters.termInstanceId,
    schoolYearId: filters.schoolYearId,
    semester: filters.semester as AcademicSemester | undefined,
  });
  return query ? `${path}?${query}` : path;
}

// ---------------------------------------------------------------------------
// Qualitative pulse (§13.10)
// ---------------------------------------------------------------------------

type QualitativeRow = {
  text_content: string;
  response: { respondent_id: string };
};

/**
 * Aggregate the qualitative pulse over non-empty submitted answers. Tokens
 * are identifier-redacted server-side and capped at QUALITATIVE_TOKEN_CAP.
 */
export function summarizeQualitativePulse(rows: QualitativeRow[]): QualitativePulse {
  const contributing = rows.filter((row) => row.text_content.trim().length > 0);
  return {
    // Person-level: one person answering several evaluations counts once.
    respondentCount: new Set(contributing.map((row) => row.response.respondent_id)).size,
    answerCount: contributing.length,
    tokens: buildRedactedWordCloudTokens(contributing.map((row) => row.text_content)).slice(
      0,
      QUALITATIVE_TOKEN_CAP
    ),
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
  if (!periodFilters.schoolYearId && !periodFilters.semester && !periodFilters.termInstanceId) {
    const activeTermId = await getActiveTermId();
    if (activeTermId) {
      effectiveFilters = { termInstanceId: activeTermId };
    }
  }

  const {
    where: termInstanceWhere,
    schoolYearLabel,
    instances,
  } = await resolveTermInstanceFilter(scope.programId, effectiveFilters);
  const activeEvaluations = await listActiveEvaluations(scope.programId, termInstanceWhere);

  // A term filter that matches no in-Program deployments still names the
  // canonical Academic Period it selected — never a generic placeholder.
  let periodLabel = buildPeriodLabel(effectiveFilters, schoolYearLabel, instances);
  if (!periodLabel && effectiveFilters.termInstanceId) {
    const activeTerm = await resolveActiveTerm();
    if (activeTerm?.termInstance.id === effectiveFilters.termInstanceId) {
      const { schoolYearCode, semester, term } = activeTerm.termInstance;
      periodLabel = buildInstancePeriodLabel({
        school_year: { code: schoolYearCode },
        semester,
        term,
      });
    }
  }

  const programResponseScope = buildProgramResponseScope(scope.programId, termInstanceWhere);
  const programOpportunityScope = buildProgramOpportunityScope(scope.programId, termInstanceWhere);

  const [participationRows, ratingRows, qualitativeRows, programGos] = await Promise.all([
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
      select: { text_content: true, response: { select: { respondent_id: true } } },
    }),
    prisma.pO.findMany({
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

  // ── PO evidence per source (§13.8) ──────────────────────────────────────

  const courseBoundRows = ratingRows.filter((row) => row.response.assignment.course_bound);
  const centralRows = ratingRows.filter((row) => !row.response.assignment.course_bound);

  const [bindingByKey, centralBindings] = await Promise.all([
    loadCourseBindings(courseBoundRows, scope.programId),
    loadCentralPoBindings(centralRows),
  ]);

  const poRowsBySource: Record<DashboardSourceKey, DashboardPoRow[]> = {
    COURSE_STUDENT: toDashboardPoRows(
      buildCourseDerivedPoMetrics(
        buildCourseGoRatingRows(courseBoundRows, bindingByKey, snapshotById)
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
    poRowsBySource[sourceKey] = toDashboardPoRows(
      buildProgramWidePoMetrics(
        buildCentralPoRatingRows(
          centralBySource.get(sourceKey) ?? [],
          centralBindings,
          snapshotById
        )
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

  const needsAttention = buildNeedsAttentionItems({
    programId: scope.programId,
    now,
    deployments: activeEvaluations.deployments,
    submittedCountsByDeployment,
    programGos,
    poRowsBySource,
    periodFilters: effectiveFilters,
  });

  return {
    programLabel: scope.programLabel,
    programCode: scope.programCode,
    periodLabel,
    participation,
    activeEvaluations: {
      total: activeEvaluations.deployments.length,
      closingWithin7Days: activeEvaluations.deployments.filter((deployment) =>
        isClosingWithinSevenDays(deployment, now)
      ).length,
    },
    poSources: poRowsBySource,
    poCatalog: programGos.map((po) => ({ id: po.id, code: po.code })),
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
  // resolveTermInstanceFilter returns a scalar term_instance_id predicate;
  // apply it on the FK columns of both deployment kinds.
  const termInstanceId = termInstanceWhere.term_instance_id as
    | string
    | { in: string[] }
    | undefined;
  const [central, courseBound] = await Promise.all([
    prisma.centralDeployment.findMany({
      where: {
        program_id: programId,
        status: DeploymentStatus.ACTIVE,
        term_instance_id: termInstanceId,
      },
      select: { id: true, deployment_name: true, status: true, deadline_at: true },
    }),
    prisma.courseBoundEvaluation.findMany({
      where: {
        course_assignment: { program_id: programId, course: { course_scope: "PROGRAM_SPECIFIC" } },
        status: DeploymentStatus.ACTIVE,
        term_instance_id: termInstanceId,
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

/** Load CILO and direct PO bindings keyed by evaluation plus question. */
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
  if (evaluationIds.length === 0) return new Map();
  const [ciloBindings, directBindings] = await Promise.all([
    prisma.courseBoundCiloQuestionBinding.findMany({
      where: { course_bound_evaluation_id: { in: evaluationIds }, cilo_id: { not: null } },
      select: {
        course_bound_evaluation_id: true,
        section_key: true,
        item_key: true,
        cilo: {
          select: {
            id: true,
            description: true,
            cilo_mappings: {
              where: { po: { program_id: programId } },
              select: {
                manifestation: true,
                po: { select: { id: true, code: true, description: true } },
              },
            },
          },
        },
      },
    }),
    prisma.courseBoundPoQuestionBinding.findMany({
      where: { course_bound_evaluation_id: { in: evaluationIds } },
      select: {
        course_bound_evaluation_id: true,
        section_key: true,
        item_key: true,
        po_id: true,
        po_code_snapshot: true,
        po_description_snapshot: true,
      },
    }),
  ]);
  const byKey = new Map<string, CourseBindingRow>();
  for (const binding of ciloBindings) {
    byKey.set(
      encodeCourseBindingKey(
        binding.course_bound_evaluation_id,
        binding.section_key,
        binding.item_key
      ),
      {
        ...binding,
        directPoMappings: [],
      }
    );
  }
  for (const binding of directBindings) {
    const key = encodeCourseBindingKey(
      binding.course_bound_evaluation_id,
      binding.section_key,
      binding.item_key
    );
    const existing = byKey.get(key) ?? {
      course_bound_evaluation_id: binding.course_bound_evaluation_id,
      section_key: binding.section_key,
      item_key: binding.item_key,
      cilo: null,
      directPoMappings: [],
    };
    existing.directPoMappings!.push({
      poId:
        binding.po_id ?? `snapshot:${binding.po_code_snapshot}:${binding.po_description_snapshot}`,
      poCode: binding.po_code_snapshot,
      poDescription: binding.po_description_snapshot,
    });
    byKey.set(key, existing);
  }
  return byKey;
}

async function loadCentralPoBindings(
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
  const snapshots = await prisma.centralDeploymentPoSnapshot.findMany({
    where: { central_deployment_id: { in: deploymentIds }, po_id: { not: null } },
    select: {
      central_deployment_id: true,
      section_key: true,
      item_key: true,
      po: { select: { id: true, code: true, description: true } },
    },
  });
  const byDeployment: CentralBindingsByDeployment = new Map();
  for (const snapshot of snapshots) {
    let byQuestion = byDeployment.get(snapshot.central_deployment_id);
    if (!byQuestion) {
      byQuestion = new Map();
      byDeployment.set(snapshot.central_deployment_id, byQuestion);
    }
    const questionKey = encodeQuestionKey(snapshot.section_key, snapshot.item_key);
    const bindings = byQuestion.get(questionKey) ?? [];
    bindings.push({
      poId: snapshot.po!.id,
      poCode: snapshot.po!.code,
      poDescription: snapshot.po!.description,
    });
    byQuestion.set(questionKey, bindings);
  }
  return byDeployment;
}

function buildDashboardLinks(programId: string, filters: DashboardPeriodFilters): DashboardLinks {
  return {
    responses: buildProgramHeadResponsesUrl(programId, {
      termInstanceId: filters.termInstanceId,
      schoolYearId: filters.schoolYearId,
      semester: filters.semester as AcademicSemester | undefined,
      tab: "course",
      page: 1,
    }),
    responsesActiveCourse: buildProgramHeadResponsesUrl(programId, {
      termInstanceId: filters.termInstanceId,
      schoolYearId: filters.schoolYearId,
      semester: filters.semester as AcademicSemester | undefined,
      tab: "course",
      page: 1,
      status: DeploymentStatus.ACTIVE,
    }),
    analyticsOutcomes: buildAnalyticsUrl(programId, { ...filters, tab: "outcomes" }),
    analyticsStakeholders: buildAnalyticsUrl(programId, { ...filters, tab: "stakeholders" }),
    analyticsFeedback: buildAnalyticsUrl(programId, { ...filters, tab: "qualitative" }),
  };
}
