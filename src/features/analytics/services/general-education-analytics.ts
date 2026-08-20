import type { AcademicSemester } from "@prisma/client";
import { ResponseStatus } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  buildRedactedWordCloudTokens,
  FEEDBACK_SOURCE_LABELS,
} from "./qualitative-analytics";
import {
  buildProgramHeadOverviewKpi,
  buildTrendSeries,
  extractDistinctScales,
  buildScaleIdentities,
  describeScales,
  semesterOrder,
  termOrder,
  type TrendSeriesPeriodInput,
} from "./program-head-analytics-aggregators";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
import type { GeneralEducationAnalyticsFilterState } from "./general-education-analytics-state";
import type {
  GeneralEducationAnalyticsDTO,
  GeneralEducationCourseBreakdownRow,
  GeneralEducationFeedbackDTO,
  GeneralEducationTrendsDTO,
} from "../general-education-analytics-types";

// -- Period helpers (no selected-Program — cross-program GE scope) --------

type TermInstanceSummary = {
  id: string;
  semester: string;
  term: string | null;
  school_year: { id: string; code: string };
};

const SEMESTER_LABELS: Record<string, string> = {
  FIRST: "1st Semester",
  SECOND: "2nd Semester",
  SUMMER: "Summer",
};
const TERM_LABELS: Record<string, string> = {
  FIRST_TERM: "1st Term",
  SECOND_TERM: "2nd Term",
};
const IMPOSSIBLE_TERM_INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

function buildTermInstanceWhere(
  filters: Pick<GeneralEducationAnalyticsFilterState, "termInstanceId" | "schoolYearId" | "semester">
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.termInstanceId) (where as Record<string, unknown>).id = filters.termInstanceId;
  if (filters.schoolYearId) (where as Record<string, unknown>).school_year_id = filters.schoolYearId;
  if (filters.semester) (where as Record<string, unknown>).semester = filters.semester as AcademicSemester;
  return where;
}

function buildGeneralEducationCourseScope() {
  // Only GE courses. No central deployments.
  return { course: { course_scope: "GENERAL_EDUCATION" as const } };
}

function buildGeOpportunityScope(termInstanceWhere: Record<string, unknown>) {
  return {
    course_bound: {
      course_assignment: buildGeneralEducationCourseScope(),
      ...(Object.keys(termInstanceWhere).length > 0 ? { term_instance_id: termInstanceWhere.id ?? undefined } : {}),
      // schoolYear/semester filter via term_instance relation cannot be pushed into EvaluationAssignment directly
      // when term_instance_id is not specified; handled by collecting term instance IDs first.
    },
  } as Record<string, unknown>;
}

function buildInstancePeriodLabel(instance: TermInstanceSummary): string {
  const semesterLabel = SEMESTER_LABELS[instance.semester] ?? instance.semester;
  const termLabel = instance.term ? (TERM_LABELS[instance.term] ?? instance.term) : null;
  return [instance.school_year.code, semesterLabel, termLabel].filter(Boolean).join(" · ");
}

function buildPeriodOptions(instances: TermInstanceSummary[]) {
  const schoolYears = new Map<string, string>();
  const semesters = new Map<string, string>();
  for (const i of instances) {
    schoolYears.set(i.school_year.id, i.school_year.code);
    semesters.set(i.semester, SEMESTER_LABELS[i.semester] ?? i.semester);
  }
  return {
    schoolYears: [...schoolYears].map(([id, label]) => ({ id, label })),
    semesters: [...semesters].map(([value, label]) => ({ value, label })),
    termInstances: instances.map((i) => ({
      id: i.id,
      schoolYearId: i.school_year.id,
      schoolYearLabel: i.school_year.code,
      semester: i.semester,
      semesterLabel: SEMESTER_LABELS[i.semester] ?? i.semester,
      termLabel: i.term ? (TERM_LABELS[i.term] ?? i.term) : null,
      label: buildInstancePeriodLabel(i),
    })),
  };
}

function buildPeriodLabel(
  filters: GeneralEducationAnalyticsFilterState,
  schoolYearLabel: string | null,
  hasMatchingTerm: boolean
): string | null {
  const parts: string[] = [];
  if (schoolYearLabel) parts.push(`School Year ${schoolYearLabel}`);
  if (filters.semester) parts.push(SEMESTER_LABELS[filters.semester] ?? filters.semester);
  if (filters.termInstanceId && hasMatchingTerm) parts.push("Selected period");
  return parts.length ? parts.join(" · ") : null;
}

async function listMatchingTermInstances(
  filters: GeneralEducationAnalyticsFilterState
): Promise<TermInstanceSummary[]> {
  const where = buildTermInstanceWhere(filters);
  return prisma.academicTermInstance.findMany({
    where: Object.keys(where).length ? where : undefined,
    select: { id: true, semester: true, term: true, school_year: { select: { id: true, code: true } } },
  });
}

async function resolveSchoolYearLabel(
  schoolYearId: string | undefined,
  instances: TermInstanceSummary[]
): Promise<string | null> {
  if (!schoolYearId) return null;
  const codes = [...new Set(instances.map((i) => i.school_year.code))];
  if (codes.length === 1) return codes[0];
  const sy = await prisma.schoolYear.findUnique({ where: { id: schoolYearId }, select: { code: true } });
  return sy?.code ?? null;
}

type ResolvedTermFilter = {
  termInstanceWhere: Record<string, unknown>;
  schoolYearLabel: string | null;
  instances: TermInstanceSummary[];
  hasMatchingTerm: boolean;
};

async function resolveTermInstanceFilter(
  filters: GeneralEducationAnalyticsFilterState
): Promise<ResolvedTermFilter> {
  if (!filters.termInstanceId && !filters.schoolYearId && !filters.semester) {
    return { termInstanceWhere: {}, schoolYearLabel: null, instances: [], hasMatchingTerm: true };
  }
  const instances = await listMatchingTermInstances(filters);
  const schoolYearLabel = await resolveSchoolYearLabel(filters.schoolYearId, instances);
  const resolvedSchoolYearLabel = schoolYearLabel ?? (filters.schoolYearId ? (instances[0]?.school_year.code ?? null) : null);
  if (instances.length === 0) {
    return { termInstanceWhere: { term_instance_id: IMPOSSIBLE_TERM_INSTANCE_ID }, schoolYearLabel: resolvedSchoolYearLabel, instances, hasMatchingTerm: false };
  }
  return { termInstanceWhere: { term_instance_id: { in: instances.map((i) => i.id) } }, schoolYearLabel: resolvedSchoolYearLabel, instances, hasMatchingTerm: true };
}

// -- Auth guard ---------------------------------------------------------

async function requireGenEdCoordinator(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const session = await resolveAuthSession();
  if (!session) return { ok: false, reason: "Authentication is required." };
  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) return { ok: false, reason: "Coordinator role is required." };
  return { ok: true };
}

// -- Main read ----------------------------------------------------------

/**
 * Authorized cross-program General Education analytics.
 * Scope: submitted Course-bound responses whose CourseAssignment.course.course_scope == GENERAL_EDUCATION.
 * Excludes Program-specific and Central deployments. Request-scoped (no cache).
 * Returns null for unauthenticated / non-coordinator callers.
 */
export async function getGeneralEducationAnalytics(
  filters: GeneralEducationAnalyticsFilterState
): Promise<GeneralEducationAnalyticsDTO | null> {
  const auth = await requireGenEdCoordinator();
  if (!auth.ok) return null;

  const [{ termInstanceWhere, schoolYearLabel, hasMatchingTerm }, periodInstances] = await Promise.all([
    resolveTermInstanceFilter(filters),
    prisma.academicTermInstance.findMany({
      select: { id: true, semester: true, term: true, school_year: { select: { id: true, code: true } } },
    }),
  ]);

  // Course-bound, GE-only, submitted only
  const geResponseScope = {
    status: ResponseStatus.SUBMITTED,
    deployment_type: "COURSE_BOUND" as const,
    assignment: { course_bound: { course_assignment: buildGeneralEducationCourseScope(), ...termInstanceWhere } },
  };
  const geOpportunityWhere = {
    course_bound: { course_assignment: buildGeneralEducationCourseScope(), ...termInstanceWhere },
  };

  const [submittedResponseCount, evaluationOpportunityCount, ratingAggregate, ratingRows, responseRows, qualitativeRows] =
    await Promise.all([
      prisma.response.count({ where: geResponseScope }),
      prisma.evaluationAssignment.count({ where: geOpportunityWhere }),
      prisma.quantitativeResponseItem.aggregate({
        _sum: { rating_value: true },
        _count: { rating_value: true },
        where: { response: geResponseScope },
      }),
      prisma.quantitativeResponseItem.findMany({
        where: { response: geResponseScope },
        select: {
          rating_value: true,
          response_id: true,
          section_key: true,
          item_key: true,
          cilo_question_binding: { select: { cilo: { select: { cilo_mappings: { select: { plo: { select: { code: true } } } } } } } },
          response: {
            select: {
              assignment: {
                select: {
                  course_bound: { select: { term_instance_id: true, instrument_version_id: true, course_assignment: { select: { course: { select: { id: true, code: true, title: true } }, program_id: true } }, instrument: { select: { id: true, version_number: true, template: { select: { name: true } }, structure_snapshot: true } } } },
                },
              },
            },
          },
        },
      }),
      prisma.response.findMany({
        where: geResponseScope,
        select: {
          id: true,
          assignment: {
            select: {
              course_bound: {
                select: {
                  term_instance_id: true,
                  course_assignment: { select: { course: { select: { id: true, code: true, title: true } } } },
                  instrument: { select: { id: true, version_number: true, template: { select: { name: true } }, structure_snapshot: true } },
                },
              },
            },
          },
        },
      }),
      prisma.qualitativeResponseItem.findMany({
        where: { response: geResponseScope },
        select: {
          text_content: true,
          section_key: true,
          prompt_key: true,
          response: {
            select: {
              id: true,
              assignment: {
                select: {
                  course_bound: { select: { id: true, deployment_name: true, instrument: { select: { id: true, structure_snapshot: true } } } },
                },
              },
            },
          },
        },
      }),
    ]);

  const ratingCount = ratingAggregate._count.rating_value;
  const ratingSum = ratingAggregate._sum.rating_value ?? 0;
  const kpi = buildProgramHeadOverviewKpi({ submittedResponseCount, evaluationOpportunityCount, ratingCount, ratingSum });

  const emptyReason =
    evaluationOpportunityCount === 0 ? "no-assignments" : submittedResponseCount === 0 ? "no-submissions" : null;

  const periodLabel = buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm);

  // ponytail: loose casts bridge row shapes until Prisma selections are typed end-to-end
  const anyRatingRows = ratingRows as unknown as GeRatingRow[];
  const courseBreakdowns = buildCourseBreakdowns(anyRatingRows, responseRows as unknown as Parameters<typeof buildCourseBreakdowns>[1]);
  const trends = await buildTrends(anyRatingRows as unknown as Parameters<typeof buildTrends>[0], responseRows as unknown as Parameters<typeof buildTrends>[1], periodInstances);
  const feedback = buildFeedback(qualitativeRows, evaluationOpportunityCount, submittedResponseCount);

  return {
    scope: { periodLabel },
    kpi,
    emptyReason,
    periodOptions: buildPeriodOptions(periodInstances),
    courseBreakdowns,
    trends,
    feedback,
  };
}

// -- Course breakdowns (GE-only helpers) -----------------------------------

// ponytail: helpers intentionally accept loose row shapes via casts; typed precisely when Prisma selections stabilize
type GeRatingRow = {
  rating_value: number;
  response_id: string;
  response: { assignment: { course_bound: { course_assignment: { course: { id: string; code: string; title: string } }; instrument: { id: string; version_number: number; template: { name: string }; structure_snapshot: unknown }; term_instance_id?: string; instrument_version_id?: string | null } | null } };
  cilo_question_binding?: { cilo?: { cilo_mappings?: Array<{ plo: { code: string } }> } | null } | null;
};

function instrumentLabel(v: { template: { name: string }; version_number: number }): string {
  return `${v.template.name} v${v.version_number}`;
}

// fallow-ignore-next-line complexity
function buildCourseBreakdowns(ratingRows: GeRatingRow[], responseRows: Array<{ id: string; assignment: { course_bound: { course_assignment: { course: { id: string; code: string; title: string } }; instrument: { id: string; version_number: number; template: { name: string }; structure_snapshot: unknown } } | null } }>): GeneralEducationCourseBreakdownRow[] {
  const byCourse = new Map<
    string,
    { course: { id: string; code: string; title: string }; ratingSum: number; ratingCount: number; responseIds: Set<string>; instruments: Map<string, string>; snapshotByInstrument: Map<string, unknown>; outcomeCodes: Set<string> }
  >();

  for (const row of ratingRows as GeRatingRow[]) {
    const cb = row.response.assignment.course_bound;
    if (!cb) continue;
    const course = cb.course_assignment.course;
    let agg = byCourse.get(course.id);
    if (!agg) {
      agg = { course, ratingSum: 0, ratingCount: 0, responseIds: new Set(), instruments: new Map(), snapshotByInstrument: new Map(), outcomeCodes: new Set() };
      byCourse.set(course.id, agg);
    }
    // Keep full-precision mean; include only ratings that have an instrument snapshot match handled below
    // For GE analytics we treat all ratings as valid (no defensive PLO mapping filter unlike Program Head outcomes)
    agg.ratingSum += row.rating_value;
    agg.ratingCount += 1;
    agg.responseIds.add(row.response_id);
    agg.instruments.set(cb.instrument.id, instrumentLabel(cb.instrument));
    agg.snapshotByInstrument.set(cb.instrument.id, cb.instrument.structure_snapshot);
    const ploCodes = (row as unknown as { cilo_question_binding?: { cilo?: { cilo_mappings?: Array<{ plo: { code: string } }> } } }).cilo_question_binding?.cilo?.cilo_mappings?.map((m) => m.plo.code) ?? [];
    for (const c of ploCodes) agg.outcomeCodes.add(c);
  }
  for (const row of responseRows as Array<{ id: string; assignment: { course_bound: { course_assignment: { course: { id: string; code: string; title: string } }; instrument: { id: string; version_number: number; template: { name: string }; structure_snapshot: unknown } } | null } }>) {
    const cb = row.assignment.course_bound;
    if (!cb) continue;
    const course = cb.course_assignment.course;
    let agg = byCourse.get(course.id);
    if (!agg) {
      agg = { course, ratingSum: 0, ratingCount: 0, responseIds: new Set(), instruments: new Map(), snapshotByInstrument: new Map(), outcomeCodes: new Set() };
      byCourse.set(course.id, agg);
    }
    agg.responseIds.add(row.id);
    agg.instruments.set(cb.instrument.id, instrumentLabel(cb.instrument));
    if (!agg.snapshotByInstrument.has(cb.instrument.id)) agg.snapshotByInstrument.set(cb.instrument.id, cb.instrument.structure_snapshot);
  }

  const rows: GeneralEducationCourseBreakdownRow[] = [...byCourse.values()].map((agg) => {
    const instruments = [...agg.instruments.values()].sort();
    // Derive scale context from instrument snapshots
    const scales: ReturnType<typeof extractDistinctScales>[] = [];
    for (const snap of agg.snapshotByInstrument.values()) scales.push(extractDistinctScales(snap));
    const scaleContext = describeScales(scales.flat());
    return {
      courseId: agg.course.id,
      courseCode: agg.course.code,
      courseTitle: agg.course.title,
      meanRating: agg.ratingCount === 0 ? null : agg.ratingSum / agg.ratingCount,
      ratingCount: agg.ratingCount,
      submittedResponseCount: agg.responseIds.size,
      instrumentContext: instruments.length ? instruments.join(", ") : null,
      scaleContext,
      outcomeCodes: [...agg.outcomeCodes].sort(),
    };
  });
  rows.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  return rows;
}

// fallow-ignore-next-line complexity
async function buildTrends(
  ratingRows: Array<{ rating_value: number; response_id: string; cilo_question_binding?: { cilo?: { cilo_mappings?: Array<{ plo: { code: string } }> } }; response: { assignment: { course_bound: { term_instance_id: string; instrument_version_id: string | null } | null } } }>,
  responseRows: Array<{ id: string; assignment: { course_bound: { term_instance_id?: string | null } | null } }>,
  periodInstances: TermInstanceSummary[]
): Promise<GeneralEducationTrendsDTO> {
  const instancesById = new Map(periodInstances.map((i) => [i.id, i]));
  const periodEvidence = new Map<string, { ratingSum: number; ratingCount: number; responseIds: Set<string>; instrumentVersionIds: Set<string>; outcomeCodes: Set<string> }>();

  function getOrCreateEvidence(tid: string) {
    let e = periodEvidence.get(tid);
    if (!e) { e = { ratingSum: 0, ratingCount: 0, responseIds: new Set(), instrumentVersionIds: new Set(), outcomeCodes: new Set() }; periodEvidence.set(tid, e); }
    return e;
  }

  for (const row of ratingRows) {
    const tid = row.response.assignment.course_bound?.term_instance_id;
    const ivId = row.response.assignment.course_bound?.instrument_version_id;
    if (!tid) continue;
    const e = getOrCreateEvidence(tid);
    e.ratingSum += row.rating_value;
    e.ratingCount += 1;
    e.responseIds.add(row.response_id);
    if (ivId) e.instrumentVersionIds.add(ivId);
    for (const m of row.cilo_question_binding?.cilo?.cilo_mappings ?? []) e.outcomeCodes.add(m.plo.code);
  }
  for (const row of responseRows) {
    const tid = row.assignment.course_bound?.term_instance_id;
    if (!tid) continue;
    getOrCreateEvidence(tid).responseIds.add(row.id);
  }

  const instrumentVersionIds = [...new Set([...periodEvidence.values()].flatMap((e) => [...e.instrumentVersionIds]))];
  const instrumentVersions =
    instrumentVersionIds.length > 0
      ? await prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: { id: true, version_number: true, structure_snapshot: true, template: { select: { name: true } } },
        })
      : [];
  const versionById = new Map(instrumentVersions.map((v) => [v.id, v]));

  const inputs: TrendSeriesPeriodInput[] = [];
  for (const [tid, e] of periodEvidence) {
    const instance = instancesById.get(tid);
    if (!instance) continue;
    const versionLabels: string[] = [];
    const scales: ReturnType<typeof extractDistinctScales>[] = [];
    for (const vid of e.instrumentVersionIds) {
      const v = versionById.get(vid);
      if (!v) continue;
      versionLabels.push(`${v.template.name} v${v.version_number}`);
      scales.push(extractDistinctScales(v.structure_snapshot));
    }
    const instrumentVersionsSorted = [...new Set(versionLabels)].sort();
    const instrumentVersionIdsSorted = [...e.instrumentVersionIds].sort();
    const scaleIdentities = buildScaleIdentities(scales.flat());
    const outcomeCodes = [...e.outcomeCodes].sort();
    inputs.push({
      termInstanceId: tid,
      periodLabel: buildInstancePeriodLabel(instance),
      sortKey: [instance.school_year.code, semesterOrder(instance.semester), termOrder(instance.term)],
      meanRating: e.ratingCount === 0 ? null : e.ratingSum / e.ratingCount,
      submittedResponseCount: e.responseIds.size,
      ratingCount: e.ratingCount,
      instrumentContext: instrumentVersionsSorted.length ? instrumentVersionsSorted.join(", ") : null,
      scaleContext: describeScales(scales.flat()),
      outcomeCodes,
      fingerprint: { instrumentVersions: instrumentVersionIdsSorted, scaleIdentities, outcomeCodes },
    });
  }

  const { periods, breaks, emptyReason } = buildTrendSeries(inputs);
  return { periods, breaks, emptyReason };
}

// fallow-ignore-next-line complexity
function buildFeedback(
  rows: Array<{ text_content: string; section_key: string; prompt_key: string; response: { id: string; assignment: { course_bound: { id: string; deployment_name: string; instrument: { id: string; structure_snapshot: unknown } } | null } } }>,
  opportunityCount: number,
  submittedResponseCount: number
): GeneralEducationFeedbackDTO {
  const contributing = rows.filter((r) => r.text_content.trim().length > 0);

  // Aggregate-only tokens via existing pipeline (redacted + stopword filtered)
  const texts = contributing.map((r) => r.text_content);
  const tokens = buildRedactedWordCloudTokens(texts);

  const responseIds = new Set(contributing.map((r) => r.response.id));
  const promptBuckets = new Map<string, { sourceLabel: string; promptLabel: string; itemCount: number; responseIds: Set<string> }>();
  const evaluations = new Map<string, string>();

  function resolvePromptLabel(snap: unknown, sectionKey: string, promptKey: string): string {
    if (!Array.isArray(snap)) return "Unlabeled prompt";
    const section = snap.find((c) => isSnapshotSection(c) && (c as { key: string }).key === sectionKey);
    if (!section || !isSnapshotSection(section)) return "Unlabeled prompt";
    return getSnapshotSectionItems(section).find((i) => i.key === promptKey)?.prompt ?? "Unlabeled prompt";
  }

  for (const row of contributing) {
    const instrument = row.response.assignment.course_bound?.instrument;
    const promptLabel = resolvePromptLabel(instrument?.structure_snapshot, row.section_key, row.prompt_key);
    const bucketKey = `${instrument?.id ?? "unknown"}:${row.section_key}:${row.prompt_key}`;
    const bucket = promptBuckets.get(bucketKey) ?? { sourceLabel: FEEDBACK_SOURCE_LABELS.COURSE_STUDENT, promptLabel, itemCount: 0, responseIds: new Set<string>() };
    bucket.itemCount += 1;
    bucket.responseIds.add(row.response.id);
    promptBuckets.set(bucketKey, bucket);
    const ev = row.response.assignment.course_bound;
    if (ev) evaluations.set(ev.id, ev.deployment_name);
  }

  const displayBuckets = new Map<string, { sourceLabel: string; promptLabel: string; itemCount: number; responseIds: Set<string> }>();
  for (const b of promptBuckets.values()) {
    const key = `${b.sourceLabel}:${b.promptLabel}`;
    const d = displayBuckets.get(key) ?? { sourceLabel: b.sourceLabel, promptLabel: b.promptLabel, itemCount: 0, responseIds: new Set<string>() };
    d.itemCount += b.itemCount;
    for (const id of b.responseIds) d.responseIds.add(id);
    displayBuckets.set(key, d);
  }

  const promptCounts = [...displayBuckets.values()]
    .map((b) => ({ sourceLabel: b.sourceLabel, promptLabel: b.promptLabel, itemCount: b.itemCount, responseCount: b.responseIds.size }))
    .sort((a, b) => b.itemCount - a.itemCount || a.sourceLabel.localeCompare(b.sourceLabel) || a.promptLabel.localeCompare(b.promptLabel));

  const evidenceEvaluations = [...evaluations.entries()]
    .map(([evaluationId, deploymentName]) => ({ evaluationId, deploymentName }))
    .sort((a, b) => a.deploymentName.localeCompare(b.deploymentName) || a.evaluationId.localeCompare(b.evaluationId));

  const emptyReason: GeneralEducationFeedbackDTO["emptyReason"] =
    opportunityCount === 0 ? "no-assignments" : submittedResponseCount === 0 ? "no-submissions" : contributing.length === 0 ? "no-qualitative-evidence" : null;

  return {
    emptyReason,
    tokens,
    qualitativeItemCount: contributing.length,
    qualitativeResponseCount: responseIds.size,
    sourceLabel: FEEDBACK_SOURCE_LABELS.COURSE_STUDENT,
    promptCounts,
    evidenceEvaluations,
  };
}
