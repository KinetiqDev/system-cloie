import type { AcademicSemester, Prisma } from "@prisma/client";
import { ResponseStatus, TargetStakeholder } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  aggregateOutcomeEvidence,
  buildAttributionBreakdown,
  buildCourseBreakdownRows,
  buildInstrumentBreakdownRows,
  buildProgramHeadOverviewKpi,
  buildProgramHeadOutcomeDtos,
  buildStakeholderBuckets,
  buildTrendSeries,
  majorAttributionOf,
  semesterOrder,
  termOrder,
  yearLevelAttributionOf,
  type BreakdownAssignmentContext,
  type BreakdownRatingRow,
  type BreakdownResponseRow,
  type OutcomeEvidenceRow,
  type TrendSeriesPeriodInput,
} from "./program-head-analytics-aggregators";
import {
  buildScaleIdentities,
  describeScales,
  describeSingleScaleGroup,
  extractDistinctScales,
  resolveItemScaleIdentity,
  type ScaleDescriptor,
} from "../aggregators/scale-identity";
import { buildParticipationSummary } from "../aggregators/participation";
import { buildProgramWidePloMetrics, type CentralPloRatingRow } from "../aggregators/plo";
import {
  FEEDBACK_SOURCE_LABELS,
  buildRedactedWordCloudTokens,
  feedbackSourceKey,
} from "./qualitative-analytics";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
import type { AnalyticsFilterState } from "./program-head-analytics-state";
import { buildProgramHeadResponsesPath } from "@/lib/constants/program-head-routes";
import { buildProgramHeadResponsesUrl } from "./program-head-responses-state";
import type {
  ProgramHeadAnalyticsPeriodOptions,
  ProgramHeadAnalyticsScopeSummary,
  ProgramHeadBreakdownsDTO,
  ProgramHeadBreakdownsEmptyReason,
  ProgramHeadContextualBreakdownDTO,
  ProgramHeadFeedbackDTO,
  ProgramHeadFeedbackEmptyReason,
  ProgramHeadFeedbackEvidenceDTO,
  ProgramHeadFeedbackPromptCountDTO,
  ProgramHeadFeedbackSourceCountDTO,
  ProgramHeadOutcomesDTO,
  ProgramHeadOutcomesEmptyReason,
  ProgramHeadProgramWideOutcomeDTO,
  ProgramHeadOverviewDTO,
  ProgramHeadStakeholdersDTO,
  ProgramHeadStakeholdersEmptyReason,
  ProgramHeadTrendsDTO,
  OverviewEmptyReason,
} from "../program-head-analytics-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TermInstanceSummary = {
  id: string;
  semester: string;
  term: string | null;
  school_year: { id: string; code: string };
};

type ResolvedTermInstanceFilter = {
  where: { term_instance_id?: string | { in: string[] } };
  schoolYearLabel: string | null;
  instances: TermInstanceSummary[];
};
type ProgramHeadAnalyticsReadContext = {
  selectedProgram: { id: string; code: string; name: string };
  termInstanceWhere: ResolvedTermInstanceFilter["where"];
  schoolYearLabel: string | null;
  periodInstances: TermInstanceSummary[];
};

function buildTermInstanceWhere(
  programId: string,
  filters: Partial<Pick<AnalyticsFilterState, "termInstanceId" | "schoolYearId" | "semester">> = {}
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    OR: [
      { central_deployments: { some: { program_id: programId } } },
      { course_bound_evaluations: { some: { course_assignment: { program_id: programId } } } },
    ],
  };
  if (filters.termInstanceId) where.id = filters.termInstanceId;
  if (filters.schoolYearId) where.school_year_id = filters.schoolYearId;
  if (filters.semester) where.semester = filters.semester as AcademicSemester;
  return where;
}

/** Sentinel term filter that matches no rows, used when a filter resolves to nothing. */
export const IMPOSSIBLE_TERM_INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Evidence-source narrowing for analytics reads (§15). COURSE keeps only
 * course-bound evidence; central sources keep only central deployments of the
 * matching stakeholder (the source implies the population when no explicit
 * stakeholder is present, and the state layer already drops incompatible
 * stakeholder values). A bare stakeholder filter narrows to central
 * deployments of that stakeholder; course-bound evidence is student evidence.
 */
type SourceScope = {
  response: {
    deployment_type: "CENTRAL" | "COURSE_BOUND" | "ANY";
    target_stakeholder?: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";
  };
  assignment: {
    deployment_type: "CENTRAL" | "COURSE_BOUND" | "ANY";
    target_stakeholder?: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";
  };
};

const SOURCE_DEFAULT_STAKEHOLDER = {
  PROGRAM_WIDE_STUDENT: "STUDENT",
  ALUMNI: "ALUMNI",
  INDUSTRY: "INDUSTRY_PARTNER",
} as const;

function buildSourceScope(filters: AnalyticsFilterState): SourceScope | null {
  const kind = filters.evidenceSource;
  if (kind === "COURSE") {
    return {
      response: { deployment_type: "COURSE_BOUND" },
      assignment: { deployment_type: "COURSE_BOUND" },
    };
  }
  const stakeholder = filters.stakeholder ?? (kind ? SOURCE_DEFAULT_STAKEHOLDER[kind] : undefined);
  if (!kind && !stakeholder) return null;
  // A bare STUDENT stakeholder owns course-bound evidence and central
  // program-wide student evidence; excluding course-bound would silently
  // under-report students under an advertised all-source scope.
  if (!kind && stakeholder === "STUDENT") {
    return {
      response: { deployment_type: "ANY", target_stakeholder: "STUDENT" },
      assignment: { deployment_type: "ANY", target_stakeholder: "STUDENT" },
    };
  }
  return {
    response: { deployment_type: "CENTRAL", target_stakeholder: stakeholder },
    assignment: { deployment_type: "CENTRAL", target_stakeholder: stakeholder },
  };
}

/** Response predicate scoped to the selected Program through both deployment kinds. */
export function buildProgramResponseScope(
  programId: string,
  termInstanceWhere: Record<string, unknown>,
  source?: SourceScope["response"]
) {
  if (source) {
    const central = {
      deployment_type: "CENTRAL" as const,
      assignment: {
        central_deployment: {
          program_id: programId,
          ...termInstanceWhere,
          ...(source.target_stakeholder ? { target_stakeholder: source.target_stakeholder } : {}),
        },
      },
    };
    const courseBound = {
      deployment_type: "COURSE_BOUND" as const,
      assignment: {
        course_bound: {
          course_assignment: { program_id: programId },
          ...termInstanceWhere,
        },
      },
    };
    if (source.deployment_type === "CENTRAL") return central;
    if (source.deployment_type === "COURSE_BOUND") return courseBound;
    return { OR: [central, courseBound] };
  }
  return {
    OR: [
      {
        deployment_type: "CENTRAL" as const,
        assignment: {
          central_deployment: {
            program_id: programId,
            ...termInstanceWhere,
          },
        },
      },
      {
        deployment_type: "COURSE_BOUND" as const,
        assignment: {
          course_bound: {
            course_assignment: { program_id: programId },
            ...termInstanceWhere,
          },
        },
      },
    ],
  };
}

/** EvaluationAssignment predicate scoped to the selected Program through both deployment kinds. */
export function buildProgramOpportunityScope(
  programId: string,
  termInstanceWhere: Record<string, unknown>,
  source?: SourceScope["assignment"]
) {
  if (source) {
    const central = {
      central_deployment: {
        program_id: programId,
        ...termInstanceWhere,
        ...(source.target_stakeholder ? { target_stakeholder: source.target_stakeholder } : {}),
      },
    };
    const courseBound = {
      course_bound: {
        course_assignment: { program_id: programId },
        ...termInstanceWhere,
      },
    };
    if (source.deployment_type === "CENTRAL") return central;
    if (source.deployment_type === "COURSE_BOUND") return courseBound;
    return { OR: [central, courseBound] };
  }
  return {
    OR: [
      {
        central_deployment: {
          program_id: programId,
          ...termInstanceWhere,
        },
      },
      {
        course_bound: {
          course_assignment: { program_id: programId },
          ...termInstanceWhere,
        },
      },
    ],
  };
}

async function listMatchingTermInstances(
  programId: string,
  filters: Partial<Pick<AnalyticsFilterState, "termInstanceId" | "schoolYearId" | "semester">> = {}
): Promise<TermInstanceSummary[]> {
  return prisma.academicTermInstance.findMany({
    where: buildTermInstanceWhere(programId, filters),
    select: {
      id: true,
      semester: true,
      term: true,
      school_year: { select: { id: true, code: true } },
    },
  });
}

async function listProgramPeriodOptions(programId: string): Promise<TermInstanceSummary[]> {
  return listMatchingTermInstances(programId);
}

async function resolveSchoolYearLabel(
  schoolYearId: string | undefined,
  instances: TermInstanceSummary[]
): Promise<string | null> {
  if (!schoolYearId) return null;
  const codes = [...new Set(instances.map((instance) => instance.school_year.code))];
  if (codes.length === 1) return codes[0];

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { code: true },
  });
  return schoolYear?.code ?? null;
}

export async function resolveTermInstanceFilter(
  programId: string,
  filters: Pick<AnalyticsFilterState, "termInstanceId" | "schoolYearId" | "semester">
): Promise<ResolvedTermInstanceFilter> {
  if (!filters.termInstanceId && !filters.schoolYearId && !filters.semester) {
    return { where: {}, schoolYearLabel: null, instances: [] };
  }

  const instances = await listMatchingTermInstances(programId, filters);
  const schoolYearLabel = await resolveSchoolYearLabel(filters.schoolYearId, instances);
  const resolvedSchoolYearLabel =
    schoolYearLabel ?? (filters.schoolYearId ? (instances[0]?.school_year.code ?? null) : null);

  if (instances.length === 0) {
    return {
      where: { term_instance_id: IMPOSSIBLE_TERM_INSTANCE_ID },
      schoolYearLabel: resolvedSchoolYearLabel,
      instances,
    };
  }

  return {
    where: { term_instance_id: { in: instances.map((instance) => instance.id) } },
    schoolYearLabel: resolvedSchoolYearLabel,
    instances,
  };
}

const SEMESTER_LABELS: Record<string, string> = {
  FIRST: "1st Semester",
  SECOND: "2nd Semester",
  SUMMER: "Summer",
};

const TERM_LABELS: Record<string, string> = {
  FIRST_TERM: "1st Term",
  SECOND_TERM: "2nd Term",
};

function buildPeriodOptions(instances: TermInstanceSummary[]) {
  const schoolYears = new Map<string, string>();
  const semesters = new Map<string, string>();
  for (const instance of instances) {
    schoolYears.set(instance.school_year.id, instance.school_year.code);
    semesters.set(instance.semester, SEMESTER_LABELS[instance.semester] ?? instance.semester);
  }

  return {
    schoolYears: [...schoolYears].map(([id, label]) => ({ id, label })),
    semesters: [...semesters].map(([value, label]) => ({ value, label })),
    termInstances: instances.map((instance) => {
      return {
        id: instance.id,
        schoolYearId: instance.school_year.id,
        schoolYearLabel: instance.school_year.code,
        semester: instance.semester,
        semesterLabel: SEMESTER_LABELS[instance.semester] ?? instance.semester,
        termLabel: instance.term ? (TERM_LABELS[instance.term] ?? instance.term) : null,
        label: buildInstancePeriodLabel(instance),
      };
    }),
  };
}
const resolveProgramHeadAnalyticsReadContext = cache(
  async function resolveProgramHeadAnalyticsReadContext(
    programId: string,
    filters: AnalyticsFilterState
  ): Promise<ProgramHeadAnalyticsReadContext | null> {
    const contextResult = await resolveProgramHeadContext(programId);
    if (!contextResult.success) return null;

    const { selectedProgram } = contextResult.data;
    const [{ where: termInstanceWhere, schoolYearLabel }, periodInstances] = await Promise.all([
      resolveTermInstanceFilter(selectedProgram.id, filters),
      listProgramPeriodOptions(selectedProgram.id),
    ]);

    return { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances };
  }
);

export async function getProgramHeadAnalyticsFrame(
  programId: string,
  filters: AnalyticsFilterState
): Promise<{
  scope: ProgramHeadAnalyticsScopeSummary;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
} | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;
  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;
  return {
    scope: {
      programCode: selectedProgram.code,
      programName: selectedProgram.name,
      periodLabel: buildPeriodLabel(
        filters,
        schoolYearLabel,
        termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID
      ),
    },
    periodOptions: buildPeriodOptions(periodInstances),
  };
}

export function buildPeriodLabel(
  filters: Pick<AnalyticsFilterState, "semester" | "termInstanceId">,
  schoolYearLabel: string | null,
  hasMatchingTerm: boolean
): string | null {
  const parts: string[] = [];
  if (schoolYearLabel) parts.push(`School Year ${schoolYearLabel}`);
  if (filters.semester) parts.push(SEMESTER_LABELS[filters.semester] ?? filters.semester);
  if (filters.termInstanceId && hasMatchingTerm) parts.push("Selected period");
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

/** Readable label for one canonical AcademicTermInstance. */
function buildInstancePeriodLabel(instance: TermInstanceSummary): string {
  const semesterLabel = SEMESTER_LABELS[instance.semester] ?? instance.semester;
  const termLabel = instance.term ? (TERM_LABELS[instance.term] ?? instance.term) : null;
  return [instance.school_year.code, semesterLabel, termLabel].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getProgramHeadAnalytics(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadOverviewDTO | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;

  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;
  // Responses tied to this program via central deployments OR course-bound evaluations,
  // following the same scope predicate as the existing dashboard service.
  const sourceScope = buildSourceScope(filters);
  const programResponseScope = buildProgramResponseScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.response
  );

  // Every in-scope EvaluationAssignment is an evaluation opportunity,
  // regardless of response status.
  const programOpportunityScope = buildProgramOpportunityScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.assignment
  );

  // One row per in-scope EvaluationAssignment: the canonical participation
  // denominator (resolved §5.12) with its response status. Submitted and
  // opportunity counts flow through the shared participation aggregator.
  const [participation, ratingAggregate] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: programOpportunityScope,
      select: {
        respondent_id: true,
        central_deployment: { select: { target_stakeholder: true } },
        response: { select: { status: true } },
      },
    }),
    prisma.quantitativeResponseItem.aggregate({
      _sum: { rating_value: true },
      _count: { rating_value: true },
      where: {
        response: {
          status: ResponseStatus.SUBMITTED,
          ...programResponseScope,
        },
      },
    }),
  ]);
  // Course-bound assignments carry no target_stakeholder column; STUDENT is
  // their canonical stakeholder (course-bound student evidence, §8). The
  // overview KPI reads only assigned/submitted totals.
  const participationSummary = buildParticipationSummary(
    participation.map((row) => ({
      respondentId: row.respondent_id,
      stakeholder: row.central_deployment?.target_stakeholder ?? TargetStakeholder.STUDENT,
      responseStatus: row.response?.status ?? null,
    }))
  );

  const ratingCount = ratingAggregate._count.rating_value;
  const ratingSum = ratingAggregate._sum.rating_value ?? 0;

  const kpi = buildProgramHeadOverviewKpi({
    submittedResponseCount: participationSummary.submitted,
    evaluationOpportunityCount: participationSummary.assigned,
    ratingCount,
    ratingSum,
  });
  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const periodLabel = buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm);
  const scope: ProgramHeadAnalyticsScopeSummary = {
    programCode: selectedProgram.code,
    programName: selectedProgram.name,
    periodLabel,
  };

  const emptyReason: OverviewEmptyReason =
    participationSummary.assigned === 0
      ? "no-assignments"
      : participationSummary.submitted === 0
        ? "no-submissions"
        : null;

  return {
    scope,
    kpi,
    emptyReason,
    periodOptions: buildPeriodOptions(periodInstances),
  };
}

// ---------------------------------------------------------------------------
// Trends read
// ---------------------------------------------------------------------------

type TrendRatingRow = Prisma.QuantitativeResponseItemGetPayload<{
  select: {
    rating_value: true;
    response_id: true;
    cilo_question_binding: {
      select: {
        cilo: {
          select: {
            cilo_mappings: {
              select: { plo: { select: { code: true } } };
            };
          };
        };
      };
    };
    response: {
      select: {
        assignment: {
          select: {
            course_bound: {
              select: { term_instance_id: true; instrument_version_id: true };
            };
            central_deployment: {
              select: { term_instance_id: true; instrument_version_id: true };
            };
          };
        };
      };
    };
  };
}>;

type TrendResponseRow = Prisma.ResponseGetPayload<{
  select: {
    id: true;
    assignment: {
      select: {
        course_bound: { select: { term_instance_id: true } };
        central_deployment: { select: { term_instance_id: true } };
      };
    };
  };
}>;

type PeriodEvidence = {
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
  instrumentVersionIds: Set<string>;
  outcomeCodes: Set<string>;
};

function ratingRowTermContext(row: TrendRatingRow): {
  termInstanceId: string | null;
  instrumentVersionId: string | null;
} {
  const courseBound = row.response.assignment.course_bound;
  const central = row.response.assignment.central_deployment;
  return {
    termInstanceId: courseBound?.term_instance_id ?? central?.term_instance_id ?? null,
    instrumentVersionId:
      courseBound?.instrument_version_id ?? central?.instrument_version_id ?? null,
  };
}

function getOrCreateTrendEvidence(
  periodEvidence: Map<string, PeriodEvidence>,
  termInstanceId: string
): PeriodEvidence {
  let evidence = periodEvidence.get(termInstanceId);
  if (!evidence) {
    evidence = {
      ratingSum: 0,
      ratingCount: 0,
      responseIds: new Set(),
      instrumentVersionIds: new Set(),
      outcomeCodes: new Set(),
    };
    periodEvidence.set(termInstanceId, evidence);
  }
  return evidence;
}

function collectTrendPeriodEvidence(
  ratingRows: TrendRatingRow[],
  responseRows: TrendResponseRow[]
): Map<string, PeriodEvidence> {
  const periodEvidence = new Map<string, PeriodEvidence>();

  for (const row of ratingRows) {
    accumulateRatingRow(periodEvidence, row);
  }
  for (const row of responseRows) {
    accumulateResponseRow(periodEvidence, row);
  }

  return periodEvidence;
}

function accumulateRatingRow(
  periodEvidence: Map<string, PeriodEvidence>,
  row: TrendRatingRow
): void {
  const context = ratingRowTermContext(row);
  if (!context.termInstanceId) {
    return;
  }

  const evidence = getOrCreateTrendEvidence(periodEvidence, context.termInstanceId);
  evidence.ratingSum += row.rating_value;
  evidence.ratingCount += 1;
  evidence.responseIds.add(row.response_id);
  if (context.instrumentVersionId) {
    evidence.instrumentVersionIds.add(context.instrumentVersionId);
  }
  for (const mapping of row.cilo_question_binding?.cilo?.cilo_mappings ?? []) {
    evidence.outcomeCodes.add(mapping.plo.code);
  }
}

function accumulateResponseRow(
  periodEvidence: Map<string, PeriodEvidence>,
  row: TrendResponseRow
): void {
  const termInstanceId =
    row.assignment.course_bound?.term_instance_id ??
    row.assignment.central_deployment?.term_instance_id;
  if (!termInstanceId) {
    return;
  }

  const evidence = getOrCreateTrendEvidence(periodEvidence, termInstanceId);
  evidence.responseIds.add(row.id);
}

function buildTrendSeriesInputs(
  periodEvidence: Map<string, PeriodEvidence>,
  instancesById: Map<string, TermInstanceSummary>,
  versionById: Map<
    string,
    { id: string; version_number: number; structure_snapshot: unknown; template: { name: string } }
  >
): TrendSeriesPeriodInput[] {
  const inputs: TrendSeriesPeriodInput[] = [];

  for (const [termInstanceId, evidence] of periodEvidence) {
    const instance = instancesById.get(termInstanceId);
    if (!instance) continue;

    const versionLabels: string[] = [];
    const scales: ScaleDescriptor[][] = [];
    for (const versionId of evidence.instrumentVersionIds) {
      const version = versionById.get(versionId);
      if (!version) continue;
      versionLabels.push(`${version.template.name} v${version.version_number}`);
      scales.push(...extractDistinctScales(version.structure_snapshot));
    }

    const instrumentVersionsSorted = [...new Set(versionLabels)].sort();
    const instrumentVersionIdsSorted = [...evidence.instrumentVersionIds].sort();
    const scaleIdentities = buildScaleIdentities(scales);
    const outcomeCodes = [...evidence.outcomeCodes].sort();

    inputs.push({
      termInstanceId,
      periodLabel: buildInstancePeriodLabel(instance),
      sortKey: [
        instance.school_year.code,
        semesterOrder(instance.semester),
        termOrder(instance.term),
      ],
      meanRating: evidence.ratingCount === 0 ? null : evidence.ratingSum / evidence.ratingCount,
      submittedResponseCount: evidence.responseIds.size,
      ratingCount: evidence.ratingCount,
      instrumentContext:
        instrumentVersionsSorted.length > 0 ? instrumentVersionsSorted.join(", ") : null,
      scaleContext: describeScales(scales),
      outcomeCodes,
      fingerprint: {
        instrumentVersions: instrumentVersionIdsSorted,
        scaleIdentities,
        outcomeCodes,
      },
    });
  }

  return inputs;
}

/** Response predicate scoped to the selected Program's course-bound evidence only. */
function buildCourseBoundResponseScope(
  programId: string,
  termInstanceWhere: Record<string, unknown>
) {
  return {
    deployment_type: "COURSE_BOUND" as const,
    assignment: {
      course_bound: {
        course_assignment: { program_id: programId },
        ...termInstanceWhere,
      },
    },
  };
}

/** Narrow projection of a course-bound rating row for PLO evidence. */
type OutcomeRatingRow = {
  rating_value: number;
  response_id: string;
  section_key: string;
  item_key: string;
  response: {
    assignment: {
      course_bound_id: string | null;
      course_bound: { instrument_version_id: string | null } | null;
    };
  };
};

/** Narrow projection of a publication-time CILO question binding. */
type OutcomeBindingRow = {
  section_key: string;
  item_key: string;
  course_bound_evaluation_id: string;
  course_bound_evaluation: { deployment_name: string };
  cilo: {
    id: string;
    description: string;
    course: { id: string; code: string; title: string } | null;
    cilo_mappings: Array<{ plo: { id: string; code: string; description: string } }>;
  } | null;
};

function toPloMapping(mapping: { plo: { id: string; code: string; description: string } }) {
  return { ploId: mapping.plo.id, code: mapping.plo.code, name: mapping.plo.description };
}

function resolveInstrumentSnapshot(
  instrumentVersionId: string | null,
  snapshotById: Map<string, unknown>
): { id: string; structureSnapshot: unknown } | null {
  if (!instrumentVersionId) {
    return null;
  }
  return {
    id: instrumentVersionId,
    structureSnapshot: snapshotById.get(instrumentVersionId) ?? null,
  };
}

/**
 * Map one course-bound rating to its normalized PLO evidence row through the
 * publication-time binding identified by evaluation plus section/item keys.
 * Returns null when the item has no binding, the bound CILO was deleted, or
 * the CILO has no canonical mapping for the selected Program.
 */
function toOutcomeEvidenceRow(
  row: OutcomeRatingRow,
  bindingByItemKey: Map<string, OutcomeBindingRow>,
  snapshotById: Map<string, unknown>
): OutcomeEvidenceRow | null {
  const binding = bindingByItemKey.get(
    `${row.response.assignment.course_bound_id ?? ""}:${row.section_key}:${row.item_key}`
  );
  const cilo = binding?.cilo;
  if (!cilo || cilo.cilo_mappings.length === 0) {
    return null;
  }
  return {
    ratingValue: row.rating_value,
    responseId: row.response_id,
    sectionKey: row.section_key,
    itemKey: row.item_key,
    instrumentVersion: resolveInstrumentSnapshot(
      row.response.assignment.course_bound?.instrument_version_id ?? null,
      snapshotById
    ),
    cilo: { id: cilo.id, description: cilo.description, course: cilo.course },
    ploMappings: cilo.cilo_mappings.map(toPloMapping),
    evaluationId: binding.course_bound_evaluation_id,
    deploymentName: binding.course_bound_evaluation.deployment_name,
  };
}

/**
 * Disclosure that historical ratings are grouped by the Program's current
 * CILO-to-PLO mappings. Publication-time mapping snapshots do not exist yet,
 * so later mapping edits may reinterpret historical outcome rows.
 */
const CURRENT_MAPPING_DISCLOSURE =
  "Outcome rows group historical ratings using the Program's current CILO-to-PLO mappings. " +
  "Publication-time mapping snapshots are not yet available, so later mapping edits may reinterpret historical outcome rows.";

/**
 * One central-deployment rating row narrowed for program-wide PLO evidence.
 * The select mirrors the fields program-wide aggregation needs: deployment
 * identity, stakeholder, instrument version, and the rating coordinates.
 */
type CentralOutcomeRatingRow = {
  rating_value: number;
  response_id: string;
  section_key: string;
  item_key: string;
  response: {
    assignment: {
      central_deployment: {
        id: string;
        deployment_name: string;
        target_stakeholder: TargetStakeholder;
        instrument_version_id: string | null;
      } | null;
    };
  };
};

type CentralPloSnapshotBinding = { ploId: string; ploCode: string; ploDescription: string };
type CentralPloBindingsByDeployment = Map<string, Map<string, CentralPloSnapshotBinding[]>>;

/** Published CentralDeploymentPloSnapshot bindings keyed by deployment then section:item. */
async function loadCentralPloBindings(
  deploymentIds: string[]
): Promise<CentralPloBindingsByDeployment> {
  if (deploymentIds.length === 0) {
    return new Map();
  }
  const snapshots = await prisma.centralDeploymentPloSnapshot.findMany({
    where: { central_deployment_id: { in: deploymentIds } },
    select: {
      central_deployment_id: true,
      plo_id: true,
      plo_code_snapshot: true,
      plo_description_snapshot: true,
      section_key: true,
      item_key: true,
    },
  });
  const byDeployment: CentralPloBindingsByDeployment = new Map();
  for (const snapshot of snapshots) {
    let byQuestion = byDeployment.get(snapshot.central_deployment_id);
    if (!byQuestion) {
      byQuestion = new Map();
      byDeployment.set(snapshot.central_deployment_id, byQuestion);
    }
    const questionKey = `${snapshot.section_key}:${snapshot.item_key}`;
    const bindings = byQuestion.get(questionKey) ?? [];
    // Identity and labels come from the immutable snapshot fields, never the
    // live PLO relation: renaming or deleting a PLO must not rewrite or drop
    // previously published analytics evidence. A deleted PLO keeps its frozen
    // label under a stable snapshot-derived identity.
    bindings.push({
      ploId:
        snapshot.plo_id ??
        `snapshot:${snapshot.plo_code_snapshot}:${snapshot.plo_description_snapshot}`,
      ploCode: snapshot.plo_code_snapshot,
      ploDescription: snapshot.plo_description_snapshot,
    });
    byQuestion.set(questionKey, bindings);
  }
  return byDeployment;
}

function resolveOutcomeRatingScale(
  instrumentVersionId: string | null,
  sectionKey: string,
  itemKey: string,
  snapshotById: Map<string, unknown>
) {
  return instrumentVersionId
    ? resolveItemScaleIdentity(snapshotById.get(instrumentVersionId) ?? null, sectionKey, itemKey)
    : null;
}

type CourseOutcomeRatingRow = {
  rating_value: number;
  response_id: string;
  section_key: string;
  item_key: string;
  response: {
    assignment: {
      course_bound_id: string | null;
      course_bound: { instrument_version_id: string | null } | null;
    };
  };
};

type OutcomeScopedEvidence = {
  ratingRows: CourseOutcomeRatingRow[];
  courseBoundOpportunityCount: number;
  courseBoundSubmittedCount: number;
  centralRatingRows: CentralOutcomeRatingRow[];
  wantsCourse: boolean;
};

/** Run the course-bound and/or central rating queries gated by the evidence-source scope. */
async function readOutcomeScopedEvidence(
  programId: string,
  termInstanceWhere: Record<string, unknown>,
  sourceScope: SourceScope | null
): Promise<OutcomeScopedEvidence> {
  const isCourseOnlySource = sourceScope?.response.deployment_type === "COURSE_BOUND";
  const isCentralSource = sourceScope?.response.deployment_type === "CENTRAL";
  const wantsCourse = !isCentralSource;
  const wantsCentral = !isCourseOnlySource;
  const courseBoundResponseScope = buildCourseBoundResponseScope(programId, termInstanceWhere);
  const centralScope =
    sourceScope && sourceScope.response.deployment_type !== "COURSE_BOUND"
      ? {
          deployment_type: "CENTRAL" as const,
          target_stakeholder: sourceScope.response.target_stakeholder,
        }
      : { deployment_type: "CENTRAL" as const };
  const centralResponseScope = wantsCentral
    ? buildProgramResponseScope(programId, termInstanceWhere, centralScope)
    : null;
  const [ratingRows, courseBoundOpportunityCount, courseBoundSubmittedCount, centralRatingRows] =
    await Promise.all([
      wantsCourse
        ? prisma.quantitativeResponseItem.findMany({
            where: { response: { status: ResponseStatus.SUBMITTED, ...courseBoundResponseScope } },
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
                      course_bound: { select: { instrument_version_id: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      wantsCourse
        ? prisma.evaluationAssignment.count({
            where: {
              course_bound: { course_assignment: { program_id: programId }, ...termInstanceWhere },
            },
          })
        : Promise.resolve(0),
      wantsCourse
        ? prisma.response.count({
            where: { status: ResponseStatus.SUBMITTED, ...courseBoundResponseScope },
          })
        : Promise.resolve(0),
      wantsCentral
        ? prisma.quantitativeResponseItem.findMany({
            where: { response: { status: ResponseStatus.SUBMITTED, ...centralResponseScope } },
            select: {
              rating_value: true,
              response_id: true,
              section_key: true,
              item_key: true,
              response: {
                select: {
                  assignment: {
                    select: {
                      central_deployment: {
                        select: {
                          id: true,
                          deployment_name: true,
                          target_stakeholder: true,
                          instrument_version_id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);
  return {
    ratingRows,
    courseBoundOpportunityCount,
    courseBoundSubmittedCount,
    centralRatingRows,
    wantsCourse,
  };
}

function outcomesEmptyReason(
  outcomesLength: number,
  programWideLength: number,
  wantsCourse: boolean,
  courseBoundOpportunityCount: number,
  courseBoundSubmittedCount: number
): ProgramHeadOutcomesEmptyReason {
  if (outcomesLength > 0 || programWideLength > 0) return null;
  if (wantsCourse) {
    return courseBoundOpportunityCount === 0
      ? "no-assignments"
      : courseBoundSubmittedCount === 0
        ? "no-submissions"
        : "no-mapped-outcomes";
  }
  return "no-program-wide-evidence";
}
/**
 * Program-wide PLO evidence through published deployment PLO snapshots
 * (§5.9, §16.6). Ratings are grouped by stakeholder so source populations are
 * never pooled; a question the deployment never bound to a live PLO
 * contributes nothing.
 */
async function buildProgramWideOutcomeDtos(
  rows: CentralOutcomeRatingRow[],
  snapshotById: Map<string, unknown>
): Promise<ProgramHeadProgramWideOutcomeDTO[]> {
  const deploymentIds = [
    ...new Set(
      rows
        .map((row) => row.response.assignment.central_deployment?.id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const bindingsByDeployment = await loadCentralPloBindings(deploymentIds);
  const byStakeholder = new Map<TargetStakeholder, CentralPloRatingRow[]>();
  for (const row of rows) {
    const deployment = row.response.assignment.central_deployment;
    const bindings = deployment
      ? bindingsByDeployment.get(deployment.id)?.get(`${row.section_key}:${row.item_key}`)
      : undefined;
    if (!deployment || !bindings || bindings.length === 0) continue;
    const bucket = byStakeholder.get(deployment.target_stakeholder) ?? [];
    bucket.push({
      sectionKey: row.section_key,
      itemKey: row.item_key,
      ratingValue: row.rating_value,
      responseId: row.response_id,
      evaluationId: deployment.id,
      scale: resolveOutcomeRatingScale(
        deployment.instrument_version_id,
        row.section_key,
        row.item_key,
        snapshotById
      ),
      ploBindings: bindings,
    });
    byStakeholder.set(deployment.target_stakeholder, bucket);
  }
  const dtos: ProgramHeadProgramWideOutcomeDTO[] = [];
  for (const [stakeholder, ratingRows] of byStakeholder) {
    for (const metric of buildProgramWidePloMetrics(ratingRows)) {
      dtos.push({
        stakeholder,
        ploId: metric.ploId,
        code: metric.ploCode,
        name: metric.ploDescription,
        meanRating: metric.mean,
        ratingCount: metric.ratingCount,
        submittedResponseCount: metric.responseCount,
        evaluationCount: metric.evaluationCount,
        questionCount: metric.questionCount,
        evidenceSummary: {
          ratingCount: metric.ratingCount,
          responseCount: metric.responseCount,
          evaluationCount: metric.evaluationCount,
          questionCount: metric.questionCount,
          scaleLabel: describeSingleScaleGroup(metric.scaleGroups),
          explanation: `Mean of ${metric.ratingCount} valid ratings from ${metric.questionCount} bound question(s) published to this Program Learning Outcome; unbound items are excluded.`,
        },
      });
    }
  }
  return dtos;
}

/**
 * Authorized Program PLO evidence read for the selected Program. Course-bound
 * quantitative items contribute through a publication-time CILO question
 * binding and a canonical selected-Program CILO-to-PLO mapping; program-wide
 * evidence contributes through published CentralDeploymentPloSnapshot
 * bindings (§16.6). Bindings are resolved by evaluation plus section/item
 * keys because the live student submission flow writes ratings without a
 * binding ID, mirroring the existing review evidence compensation.
 *
 * Historical ratings are grouped by the Program's current mappings and the
 * limitation is disclosed on the DTO. Means and distributions use only
 * in-scale ratings resolved from the frozen instrument-version structure
 * snapshot; incompatible scales are never merged. Returns null for
 * unauthorized or malformed Program requests.
 */
export async function getProgramHeadOutcomes(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadOutcomesDTO | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;

  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;

  // Course-bound PLO evidence comes from CILO bindings; program-wide PLO
  // evidence comes from published CentralDeploymentPloSnapshot bindings
  // (§5.9, §16.6). The evidence-source selection gates which read runs so one
  // source's evidence never leaks into the other section.
  const sourceScope = buildSourceScope(filters);
  const {
    ratingRows,
    courseBoundOpportunityCount,
    courseBoundSubmittedCount,
    centralRatingRows,
    wantsCourse,
  } = await readOutcomeScopedEvidence(selectedProgram.id, termInstanceWhere, sourceScope);

  // Publication-time CILO question bindings are resolved by evaluation +
  // section/item keys, because the current student submission flow writes
  // ratings without a binding ID. This mirrors the existing review and faculty
  // analytics compensation and honors the binding's unique
  // (evaluation, section_key, item_key) identity.
  const evaluationIds = [
    ...new Set(
      ratingRows
        .map((row) => row.response.assignment.course_bound_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const bindings =
    evaluationIds.length > 0
      ? await prisma.courseBoundCiloQuestionBinding.findMany({
          where: { course_bound_evaluation_id: { in: evaluationIds }, cilo_id: { not: null } },
          select: {
            section_key: true,
            item_key: true,
            course_bound_evaluation_id: true,
            course_bound_evaluation: { select: { deployment_name: true } },
            cilo: {
              select: {
                id: true,
                description: true,
                course: { select: { id: true, code: true, title: true } },
                cilo_mappings: {
                  where: { plo: { program_id: selectedProgram.id } },
                  select: { plo: { select: { id: true, code: true, description: true } } },
                },
              },
            },
          },
        })
      : [];
  const bindingByItemKey = new Map<string, (typeof bindings)[number]>();
  for (const binding of bindings) {
    const key = `${binding.course_bound_evaluation_id}:${binding.section_key}:${binding.item_key}`;
    if (!bindingByItemKey.has(key)) {
      bindingByItemKey.set(key, binding);
    }
  }

  const instrumentVersionIds = [
    ...new Set([
      ...ratingRows
        .map((row) => row.response.assignment.course_bound?.instrument_version_id)
        .filter((id): id is string => Boolean(id)),
      ...centralRatingRows
        .map((row) => row.response.assignment.central_deployment?.instrument_version_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];
  const instrumentVersions =
    instrumentVersionIds.length > 0
      ? await prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: { id: true, structure_snapshot: true },
        })
      : [];
  const snapshotById = new Map(
    instrumentVersions.map((version) => [version.id, version.structure_snapshot])
  );

  const evidenceRows: OutcomeEvidenceRow[] = ratingRows
    .map((row) => toOutcomeEvidenceRow(row, bindingByItemKey, snapshotById))
    .filter((row): row is OutcomeEvidenceRow => row !== null);

  const aggregation = aggregateOutcomeEvidence(evidenceRows);
  const outcomes = buildProgramHeadOutcomeDtos(aggregation).map((outcome) => ({
    ...outcome,
    evidenceSummary: {
      ...outcome.evidenceSummary,
      evidenceHref: buildProgramHeadResponsesPath(selectedProgram.id, "course"),
    },
  }));

  const programWideOutcomes = (
    await buildProgramWideOutcomeDtos(centralRatingRows, snapshotById)
  ).map((outcome) => ({
    ...outcome,
    evidenceSummary: {
      ...outcome.evidenceSummary,
      evidenceHref: buildProgramHeadResponsesUrl(selectedProgram.id, {
        tab: "program-wide",
        page: 1,
        stakeholder: outcome.stakeholder,
      }),
    },
  }));

  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const emptyReason = outcomesEmptyReason(
    outcomes.length,
    programWideOutcomes.length,
    wantsCourse,
    courseBoundOpportunityCount,
    courseBoundSubmittedCount
  );

  return {
    scope: {
      programCode: selectedProgram.code,
      programName: selectedProgram.name,
      periodLabel: buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm),
    },
    periodOptions: buildPeriodOptions(periodInstances),
    emptyReason,
    currentMappingDisclosure: CURRENT_MAPPING_DISCLOSURE,
    manyToManyDisclosure: aggregation.hasMultiMappedCilo,
    outcomes,
    programWideOutcomes,
  };
}

/**
 * Authorized Trends read for the selected Program. Periods resolve through
 * canonical `AcademicTermInstance` context; evidence is SUBMITTED-only and
 * scoped to the selected Program through central deployments and course-bound
 * evaluations. Retired or inactive catalog records remain queryable because no
 * activity filter is applied. Returns null for unauthorized or malformed
 * Program requests.
 */
export async function getProgramHeadTrends(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadTrendsDTO | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;

  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;

  const sourceScope = buildSourceScope(filters);
  const programResponseScope = buildProgramResponseScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.response
  );

  const [ratingRows, responseRows] = await Promise.all([
    prisma.quantitativeResponseItem.findMany({
      where: { response: { status: ResponseStatus.SUBMITTED, ...programResponseScope } },
      select: {
        rating_value: true,
        response_id: true,
        cilo_question_binding: {
          select: {
            cilo: {
              select: {
                cilo_mappings: {
                  where: { plo: { program_id: selectedProgram.id } },
                  select: { plo: { select: { code: true } } },
                },
              },
            },
          },
        },
        response: {
          select: {
            assignment: {
              select: {
                course_bound: {
                  select: { term_instance_id: true, instrument_version_id: true },
                },
                central_deployment: {
                  select: { term_instance_id: true, instrument_version_id: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.response.findMany({
      where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
      select: {
        id: true,
        assignment: {
          select: {
            course_bound: { select: { term_instance_id: true } },
            central_deployment: { select: { term_instance_id: true } },
          },
        },
      },
    }),
  ]);

  const instancesById = new Map(periodInstances.map((instance) => [instance.id, instance]));
  const periodEvidence = collectTrendPeriodEvidence(ratingRows, responseRows);

  const instrumentVersionIds = [
    ...new Set(
      [...periodEvidence.values()].flatMap((evidence) => [...evidence.instrumentVersionIds])
    ),
  ];
  const instrumentVersions =
    instrumentVersionIds.length > 0
      ? await prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: {
            id: true,
            version_number: true,
            structure_snapshot: true,
            template: { select: { name: true } },
          },
        })
      : [];
  const versionById = new Map(instrumentVersions.map((version) => [version.id, version]));

  const inputs = buildTrendSeriesInputs(periodEvidence, instancesById, versionById);

  const { periods, breaks, emptyReason } = buildTrendSeries(inputs);

  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const scope: ProgramHeadAnalyticsScopeSummary = {
    programCode: selectedProgram.code,
    programName: selectedProgram.name,
    periodLabel: buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm),
  };

  return {
    scope,
    periods,
    breaks,
    emptyReason,
    periodOptions: buildPeriodOptions(periodInstances),
  };
}

// ---------------------------------------------------------------------------
// Stakeholders and Breakdowns reads
// ---------------------------------------------------------------------------

/** Narrow instrument-version projection shared by stakeholder/breakdown reads. */
const INSTRUMENT_VERSION_SELECT = {
  select: {
    id: true,
    version_number: true,
    template: { select: { name: true } },
  },
} as const;

/**
 * Narrow rating-row projection for stakeholder and breakdown aggregation.
 * The output structurally matches `BreakdownRatingRow`, so the pure helpers
 * stay unit-testable without a database. Year-level targets are pre-filtered
 * to the selected Program: attribution is defensible only for the Program
 * that owns the evidence scope.
 */
function buildBreakdownRatingRowSelect(programId: string) {
  return {
    rating_value: true,
    response_id: true,
    section_key: true,
    item_key: true,
    response: {
      select: {
        assignment: {
          select: {
            course_bound: {
              select: {
                id: true,
                deployment_name: true,
                course_assignment: {
                  select: { course: { select: { id: true, code: true, title: true } } },
                },
                instrument: INSTRUMENT_VERSION_SELECT,
                targets: {
                  where: { program_id: programId },
                  select: { year_level: true },
                },
              },
            },
            central_deployment: {
              select: {
                target_stakeholder: true,
                major: { select: { id: true, name: true } },
                year_level: true,
                instrument: INSTRUMENT_VERSION_SELECT,
              },
            },
          },
        },
      },
    },
  } as const;
}

/**
 * Narrow response-row projection for bucket and breakdown response counts.
 * The output structurally matches the aggregators' `BreakdownResponseRow`, so
 * unrated submitted responses still contribute `submittedResponseCount`.
 * Year-level targets are pre-filtered to the selected Program.
 */
function buildBreakdownResponseRowSelect(programId: string) {
  return {
    id: true,
    assignment: {
      select: {
        course_bound: {
          select: {
            id: true,
            deployment_name: true,
            course_assignment: {
              select: { course: { select: { id: true, code: true, title: true } } },
            },
            instrument: INSTRUMENT_VERSION_SELECT,
            targets: {
              where: { program_id: programId },
              select: { year_level: true },
            },
          },
        },
        central_deployment: {
          select: {
            target_stakeholder: true,
            major: { select: { id: true, name: true } },
            year_level: true,
            instrument: INSTRUMENT_VERSION_SELECT,
          },
        },
      },
    },
  } as const;
}

/**
 * Disclosure that evidence sources use different instruments and respondent
 * populations, so their means are never interchangeable or combined.
 */
const SOURCE_SEPARATION_DISCLOSURE =
  "Evidence sources are kept separate because they use different instruments and " +
  "respondent populations. Each source pools only its own ratings; sources are never " +
  "combined into one construct.";

/**
 * Authorized Stakeholders read for the selected Program. Course-bound student
 * evidence and central student-respondent, alumni, and industry-partner
 * evidence form distinct source buckets with instrument disclosure. Central
 * evidence is scoped through `central_deployment.program_id` equality, so
 * deployments with a NULL Program are excluded rather than inferred from a
 * respondent, instrument, or any transitive attribute. Returns null for
 * unauthorized or malformed Program requests.
 */
export async function getProgramHeadStakeholders(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadStakeholdersDTO | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;

  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;

  const sourceScope = buildSourceScope(filters);
  const programResponseScope = buildProgramResponseScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.response
  );
  const programOpportunityScope = buildProgramOpportunityScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.assignment
  );

  const [ratingRows, responseRows, evaluationOpportunityCount, submittedResponseCount] =
    await Promise.all([
      prisma.quantitativeResponseItem.findMany({
        where: { response: { status: ResponseStatus.SUBMITTED, ...programResponseScope } },
        select: buildBreakdownRatingRowSelect(selectedProgram.id),
      }),
      prisma.response.findMany({
        where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
        select: buildBreakdownResponseRowSelect(selectedProgram.id),
      }),
      prisma.evaluationAssignment.count({ where: programOpportunityScope }),
      prisma.response.count({
        where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
      }),
    ]);

  const instrumentVersionIds = [
    ...new Set(
      ratingRows
        .map(
          (row) =>
            row.response.assignment.course_bound?.instrument.id ??
            row.response.assignment.central_deployment?.instrument.id
        )
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const instrumentVersions =
    instrumentVersionIds.length > 0
      ? await prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: { id: true, structure_snapshot: true },
        })
      : [];
  const snapshotById = new Map(
    instrumentVersions.map((version) => [version.id, version.structure_snapshot])
  );

  const buckets = buildStakeholderBuckets(ratingRows, responseRows, snapshotById);

  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const emptyReason: ProgramHeadStakeholdersEmptyReason =
    evaluationOpportunityCount === 0
      ? "no-assignments"
      : submittedResponseCount === 0
        ? "no-submissions"
        : null;

  return {
    scope: {
      programCode: selectedProgram.code,
      programName: selectedProgram.name,
      periodLabel: buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm),
    },
    periodOptions: buildPeriodOptions(periodInstances),
    emptyReason,
    sourceSeparationDisclosure: SOURCE_SEPARATION_DISCLOSURE,
    buckets,
  };
}

/** Explanatory copy for the major dimension's attribution rule. */
const MAJOR_ATTRIBUTION_NOTE =
  "Major attribution comes only from central deployment targeting. Course-bound " +
  "evidence does not snapshot a major, and central deployments without a targeted " +
  "major are reported as Unspecified rather than guessed.";

/** Explanatory copy for the year-level dimension's attribution rule. */
const YEAR_LEVEL_ATTRIBUTION_NOTE =
  "Year-level attribution comes from deployment targeting: central deployments " +
  "target one year level, and course-bound evaluations must target exactly one year " +
  "level for this Program. Untargeted or multi-year-level evidence is reported as " +
  "Unspecified rather than guessed.";

function buildContextualBreakdown(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>,
  attributionOf: (assignment: BreakdownAssignmentContext) => { key: string; label: string } | null,
  attributionNote: string
): ProgramHeadContextualBreakdownDTO | null {
  const { rows, unspecified } = buildAttributionBreakdown(
    ratingRows,
    responseRows,
    snapshotById,
    attributionOf
  );
  // Evidence with no defensible attribution still has to stay visible as
  // per-source Unspecified rows instead of vanishing into an empty note.
  if (rows.length === 0 && unspecified.length === 0) {
    return null;
  }
  return { rows, unspecified, attributionNote };
}

/**
 * Authorized Breakdowns read for the selected Program. Course rows cover
 * course-bound student evidence only; instrument rows keep every evidence
 * source separate. Major and year-level dimensions appear only when
 * attribution is defensible; incomplete attribution is reported as
 * `Unspecified` and never inferred from names, text, or current profiles.
 * Returns null for unauthorized or malformed Program requests.
 */
export async function getProgramHeadBreakdowns(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadBreakdownsDTO | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;

  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;

  const sourceScope = buildSourceScope(filters);
  const programResponseScope = buildProgramResponseScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.response
  );
  const programOpportunityScope = buildProgramOpportunityScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.assignment
  );

  const [ratingRows, responseRows, evaluationOpportunityCount, submittedResponseCount] =
    await Promise.all([
      prisma.quantitativeResponseItem.findMany({
        where: { response: { status: ResponseStatus.SUBMITTED, ...programResponseScope } },
        select: buildBreakdownRatingRowSelect(selectedProgram.id),
      }),
      prisma.response.findMany({
        where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
        select: buildBreakdownResponseRowSelect(selectedProgram.id),
      }),
      prisma.evaluationAssignment.count({ where: programOpportunityScope }),
      prisma.response.count({
        where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
      }),
    ]);

  const instrumentVersionIds = [
    ...new Set(
      ratingRows
        .map(
          (row) =>
            row.response.assignment.course_bound?.instrument.id ??
            row.response.assignment.central_deployment?.instrument.id
        )
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const instrumentVersions =
    instrumentVersionIds.length > 0
      ? await prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: { id: true, structure_snapshot: true },
        })
      : [];
  const snapshotById = new Map(
    instrumentVersions.map((version) => [version.id, version.structure_snapshot])
  );

  const courseRows = buildCourseBreakdownRows(ratingRows, responseRows, snapshotById);
  const instrumentRows = buildInstrumentBreakdownRows(ratingRows, responseRows, snapshotById);
  const majorBreakdown = buildContextualBreakdown(
    ratingRows,
    responseRows,
    snapshotById,
    majorAttributionOf,
    MAJOR_ATTRIBUTION_NOTE
  );
  const yearLevelBreakdown = buildContextualBreakdown(
    ratingRows,
    responseRows,
    snapshotById,
    yearLevelAttributionOf,
    YEAR_LEVEL_ATTRIBUTION_NOTE
  );

  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const emptyReason: ProgramHeadBreakdownsEmptyReason =
    evaluationOpportunityCount === 0
      ? "no-assignments"
      : submittedResponseCount === 0
        ? "no-submissions"
        : null;

  return {
    scope: {
      programCode: selectedProgram.code,
      programName: selectedProgram.name,
      periodLabel: buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm),
    },
    periodOptions: buildPeriodOptions(periodInstances),
    emptyReason,
    courseRows,
    instrumentRows,
    majorBreakdown,
    yearLevelBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Feedback read
// ---------------------------------------------------------------------------

const FEEDBACK_SOURCE_ORDER = [
  "COURSE_STUDENT",
  "CENTRAL_STUDENT",
  "ALUMNI",
  "INDUSTRY_PARTNER",
] as const;

type FeedbackQualitativeRow = {
  text_content: string;
  section_key: string;
  prompt_key: string;
  response: {
    id: string;
    assignment: {
      course_bound: {
        id: string;
        deployment_name: string;
        instrument: { id: string; structure_snapshot: unknown };
      } | null;
      central_deployment: {
        target_stakeholder: string;
        instrument: { id: string; structure_snapshot: unknown };
      } | null;
    };
  };
};

function resolveFeedbackPromptLabel(
  snapshot: unknown,
  sectionKey: string,
  promptKey: string
): string {
  if (!Array.isArray(snapshot)) {
    return "Unlabeled prompt";
  }

  const section = snapshot.find(
    (candidate) => isSnapshotSection(candidate) && candidate.key === sectionKey
  );
  if (!section || !isSnapshotSection(section)) {
    return "Unlabeled prompt";
  }

  return (
    getSnapshotSectionItems(section).find((item) => item.key === promptKey)?.prompt ??
    "Unlabeled prompt"
  );
}

function instrumentOf(
  row: FeedbackQualitativeRow
): { id: string; structureSnapshot: unknown } | null {
  const instrument =
    row.response.assignment.course_bound?.instrument ??
    row.response.assignment.central_deployment?.instrument;
  return instrument
    ? { id: instrument.id, structureSnapshot: instrument.structure_snapshot }
    : null;
}

function aggregateFeedbackEvidence(rows: FeedbackQualitativeRow[]): {
  texts: string[];
  qualitativeItemCount: number;
  qualitativeResponseCount: number;
  sourceCounts: ProgramHeadFeedbackSourceCountDTO[];
  promptCounts: ProgramHeadFeedbackPromptCountDTO[];
  evidenceEvaluations: ProgramHeadFeedbackEvidenceDTO[];
} {
  const contributing = rows.filter((row) => row.text_content.trim().length > 0);
  const responseIds = new Set(contributing.map((row) => row.response.id));

  const sourceBuckets = new Map<
    ProgramHeadFeedbackSourceCountDTO["sourceKey"],
    { itemCount: number; responseIds: Set<string> }
  >();
  const promptBuckets = new Map<
    string,
    { sourceLabel: string; promptLabel: string; itemCount: number; responseIds: Set<string> }
  >();
  const evaluations = new Map<string, string>();

  for (const row of contributing) {
    const sourceKey = feedbackSourceKey({
      courseBound: row.response.assignment.course_bound,
      targetStakeholder: row.response.assignment.central_deployment?.target_stakeholder,
    });
    const source = sourceBuckets.get(sourceKey) ?? { itemCount: 0, responseIds: new Set<string>() };
    source.itemCount += 1;
    source.responseIds.add(row.response.id);
    sourceBuckets.set(sourceKey, source);

    const instrument = instrumentOf(row);
    const promptLabel = resolveFeedbackPromptLabel(
      instrument?.structureSnapshot,
      row.section_key,
      row.prompt_key
    );
    const promptBucketKey = `${sourceKey}:${instrument?.id ?? "unknown"}:${row.section_key}:${row.prompt_key}`;
    const prompt = promptBuckets.get(promptBucketKey) ?? {
      sourceLabel: FEEDBACK_SOURCE_LABELS[sourceKey],
      promptLabel,
      itemCount: 0,
      responseIds: new Set<string>(),
    };
    prompt.itemCount += 1;
    prompt.responseIds.add(row.response.id);
    promptBuckets.set(promptBucketKey, prompt);

    const evaluation = row.response.assignment.course_bound;
    if (evaluation) {
      evaluations.set(evaluation.id, evaluation.deployment_name);
    }
  }

  return {
    texts: contributing.map((row) => row.text_content),
    qualitativeItemCount: contributing.length,
    qualitativeResponseCount: responseIds.size,
    sourceCounts: FEEDBACK_SOURCE_ORDER.flatMap((sourceKey) => {
      const bucket = sourceBuckets.get(sourceKey);
      if (!bucket) {
        return [];
      }
      return [
        {
          sourceKey,
          sourceLabel: FEEDBACK_SOURCE_LABELS[sourceKey],
          itemCount: bucket.itemCount,
          responseCount: bucket.responseIds.size,
        },
      ];
    }),
    promptCounts: (() => {
      const displayBuckets = new Map<
        string,
        { sourceLabel: string; promptLabel: string; itemCount: number; responseIds: Set<string> }
      >();

      for (const bucket of promptBuckets.values()) {
        const key = `${bucket.sourceLabel}:${bucket.promptLabel}`;
        const display = displayBuckets.get(key) ?? {
          sourceLabel: bucket.sourceLabel,
          promptLabel: bucket.promptLabel,
          itemCount: 0,
          responseIds: new Set<string>(),
        };
        display.itemCount += bucket.itemCount;
        for (const responseId of bucket.responseIds) {
          display.responseIds.add(responseId);
        }
        displayBuckets.set(key, display);
      }

      return [...displayBuckets.values()]
        .map((bucket) => ({
          sourceLabel: bucket.sourceLabel,
          promptLabel: bucket.promptLabel,
          itemCount: bucket.itemCount,
          responseCount: bucket.responseIds.size,
        }))
        .sort((left, right) => {
          if (right.itemCount !== left.itemCount) {
            return right.itemCount - left.itemCount;
          }
          const sourceOrder = left.sourceLabel.localeCompare(right.sourceLabel);
          return sourceOrder === 0
            ? left.promptLabel.localeCompare(right.promptLabel)
            : sourceOrder;
        });
    })(),
    evidenceEvaluations: [...evaluations.entries()]
      .map(([evaluationId, deploymentName]) => ({ evaluationId, deploymentName }))
      .sort(
        (left, right) =>
          left.deploymentName.localeCompare(right.deploymentName) ||
          left.evaluationId.localeCompare(right.evaluationId)
      ),
  };
}

/**
 * Authorized Feedback read for the selected Program. Only non-empty
 * qualitative items on SUBMITTED responses contribute. Tokens are identifier-
 * redacted before winkNLP tokenization. The returned DTO is aggregate-only.
 */
export async function getProgramHeadFeedback(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadFeedbackDTO | null> {
  const context = await resolveProgramHeadAnalyticsReadContext(programId, filters);
  if (!context) return null;

  const { selectedProgram, termInstanceWhere, schoolYearLabel, periodInstances } = context;

  const sourceScope = buildSourceScope(filters);
  const programResponseScope = buildProgramResponseScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.response
  );
  const programOpportunityScope = buildProgramOpportunityScope(
    selectedProgram.id,
    termInstanceWhere,
    sourceScope?.assignment
  );

  const [qualitativeRows, evaluationOpportunityCount, submittedResponseCount] = await Promise.all([
    prisma.qualitativeResponseItem.findMany({
      where: {
        response: {
          status: ResponseStatus.SUBMITTED,
          ...programResponseScope,
        },
      },
      select: {
        text_content: true,
        section_key: true,
        prompt_key: true,
        response: {
          select: {
            id: true,
            assignment: {
              select: {
                course_bound: {
                  select: {
                    id: true,
                    deployment_name: true,
                    instrument: { select: { id: true, structure_snapshot: true } },
                  },
                },
                central_deployment: {
                  select: {
                    target_stakeholder: true,
                    instrument: { select: { id: true, structure_snapshot: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.evaluationAssignment.count({ where: programOpportunityScope }),
    prisma.response.count({
      where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
    }),
  ]);

  const aggregated = aggregateFeedbackEvidence(qualitativeRows);
  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const emptyReason: ProgramHeadFeedbackEmptyReason =
    evaluationOpportunityCount === 0
      ? "no-assignments"
      : submittedResponseCount === 0
        ? "no-submissions"
        : aggregated.qualitativeItemCount === 0
          ? "no-qualitative-evidence"
          : null;

  return {
    scope: {
      programCode: selectedProgram.code,
      programName: selectedProgram.name,
      periodLabel: buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm),
    },
    periodOptions: buildPeriodOptions(periodInstances),
    emptyReason,
    tokens: buildRedactedWordCloudTokens(aggregated.texts),
    qualitativeItemCount: aggregated.qualitativeItemCount,
    qualitativeResponseCount: aggregated.qualitativeResponseCount,
    sourceCounts: aggregated.sourceCounts,
    promptCounts: aggregated.promptCounts,
    evidenceEvaluations: aggregated.evidenceEvaluations,
  };
}
