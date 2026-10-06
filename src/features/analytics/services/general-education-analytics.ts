import type { Prisma, YearLevel } from "@prisma/client";
import { ResponseStatus } from "@prisma/client";
import { cache } from "react";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  generalEducationCourseAssignmentWhere,
  generalEducationCourseEvaluationWhere,
} from "@/features/response-review/services/general-education-evidence-scope";
import {
  aggregateOutcomeEvidence,
  buildOutcomeEvidenceDtos,
  ratingIsValid,
  type OutcomeEvidenceRow,
} from "../aggregators/outcome-evidence";
import { resolveSnapshotItemScale } from "../aggregators/scale-identity";
import { encodeBindingKey, encodeQuestionKey } from "../aggregators/question-identity";
import { resolveCiloLabels } from "../aggregators/cilo";
import {
  IMPOSSIBLE_TERM_INSTANCE_ID,
  buildInstancePeriodLabel,
  buildPeriodLabel,
  buildPeriodOptions,
  resolveSchoolYearLabel,
} from "./academic-periods";
import {
  FEEDBACK_SOURCE_LABELS,
  analyzeQualitativeCorpus,
  feedbackSourceKey,
  instrumentProvenanceLabels,
  instrumentVersionLabel,
  toTermToken,
  type QualitativeCorpusItem,
} from "./qualitative-analytics";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
import {
  GE_CURRENT_MAPPING_DISCLOSURE,
  GE_PROGRAM_ATTRIBUTION_NOTE,
  buildGeAlignmentCoverage,
  buildGeCoursePreviousComparable,
  buildGeCourseRows,
  buildGeOutcomeCourseMatrix,
  buildGeProgramRows,
  buildGeTrendPeriodInputs,
  buildGeTrendSeries,
  collectGeCourseEvidence,
  collectGeCourseOutcomeEvidence,
  collectGePeriodEvidence,
  emptyGeEvidenceAggregate,
  geEvidenceMean,
  geEvidenceScaleContext,
  geEvidenceSpansMultipleScales,
  geResponseRate,
  geScopeEmptyReason,
  mergeGeEvidenceIntoScope,
  mergeGeIloRows,
  resolveGePreviousComparablePeriod,
  summarizeGeOpportunities,
  summarizeUnlinkedRatings,
  type GeAssignmentRow,
  type GeCiloIloAlignment,
  type GeCourseRef,
  type GeEvidenceAggregate,
  type GeIloCatalogRow,
  type GeOutcomeIdResolver,
  type GeRatingEvidence,
  type GeResponseEvidence,
} from "./general-education-analytics-aggregators";
import {
  buildGeneralEducationAnalyticsQueryString,
  parseGeneralEducationAnalyticsSearchParams,
  toGeneralEducationEvidenceScope,
} from "./general-education-analytics-state";
import type {
  GeneralEducationAnalyticsKpi,
  GeneralEducationAnalyticsOptions,
  GeneralEducationAnalyticsFrameDTO,
  GeneralEducationCoursesDTO,
  GeneralEducationFeedbackDTO,
  GeneralEducationOutcomesDTO,
  GeneralEducationProgramsDTO,
  GeneralEducationTrendsDTO,
} from "../general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState as GeneralEducationFilters } from "./general-education-analytics-state";

// ---------------------------------------------------------------------------
// General Education Coordinator analytics (ADR 0035)
//
// Six view-gated reads over one authorized evidence scope: a shared frame plus
// one read per tab. Every read re-authorizes the active college-wide
// Coordinator role before it queries private evidence, and every read resolves
// the same General Education Course-bound predicates from the same filter set,
// so no view can drift into Program-specific or Central evidence. Views share
// request-scoped reads through `cache` keyed on the canonical filter scope;
// no result is persisted and no cache entry survives a process restart.
//
// Scope is submitted, Course-bound evidence whose Course is a General Education
// Course, aggregated across Programs. Central deployments are excluded by the
// scope predicate itself, not by a filter a caller could widen. Archived
// historical assignments stay in the response-rate denominator.
// ---------------------------------------------------------------------------

/** One typed CILO-to-ILO mapping reached through a CILO question binding. */
type GeIloMappingRow = {
  manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
  institutional_outcome: {
    id: string;
    code: string;
    description: string;
    order: number;
    is_active: boolean;
  };
};

/** Publication-time CILO question binding of one in-scope evaluation. */
type GeCiloBindingRow = {
  section_key: string;
  item_key: string;
  course_bound_evaluation_id: string;
  /** Frozen at publication, so it survives a CILO row that has since been deleted. */
  cilo_description_snapshot: string;
  cilo: {
    id: string;
    description: string;
    course: { id: string; code: string; title: string } | null;
    cilo_institutional_outcome_mappings: GeIloMappingRow[];
  } | null;
  course_bound_evaluation: {
    cilos_snapshot: unknown;
    course_assignment: { course: { id: string } };
  };
};

/** Frozen instrument version with its structure snapshot and visible label. */
type GeInstrumentVersionRow = {
  id: string;
  structure_snapshot: unknown;
  version_number: number;
  template: { name: string };
};

/** Resolved evidence every quantitative view aggregates from. */
type GeneralEducationEvidence = {
  ratingRows: GeRatingEvidence[];
  responseRows: GeResponseEvidence[];
  assignments: GeAssignmentRow[];
  snapshotById: Map<string, unknown>;
  instrumentLabels: Map<string, string>;
  evaluationOpportunityCount: number;
  submittedResponseCount: number;
  /** ILO ids each rating reaches, through its CILO's current mappings. */
  outcomeIdsByQuestion: Map<string, readonly GeIloMappingRow[]>;
  /** Evaluation -> bound CILO ids in publication order. */
  ciloIdsByEvaluation: Map<string, string[]>;
  /** Evaluation -> publication-time CILO labels resolved from its snapshot. */
  ciloLabelsByEvaluation: Map<string, Map<string, string>>;
  /** Evaluation id -> deployment name, for the review links views publish. */
  deploymentsByEvaluation: Map<string, string>;
};

/** Coordinator authorization. Every read resolves this itself, per request. */
async function requireGeneralEducationCoordinator(): Promise<boolean> {
  const session = await resolveAuthSession();
  return session?.activeRole === ROLES.GEN_ED_COORDINATOR;
}

function buildTermInstanceWhere(
  filters: GeneralEducationFilters
): Prisma.AcademicTermInstanceWhereInput {
  const where: Prisma.AcademicTermInstanceWhereInput = {};
  if (filters.termInstanceId) where.id = filters.termInstanceId;
  if (filters.schoolYearId) where.school_year_id = filters.schoolYearId;
  if (filters.semester) where.semester = filters.semester;
  return where;
}

const TERM_INSTANCE_SELECT = {
  id: true,
  semester: true,
  term: true,
  school_year: { select: { id: true, code: true } },
} as const;

/**
 * Class-context facets narrowing every evidence read. They describe the class
 * an evaluation ran in (`CourseAssignment`), never a respondent's Program
 * membership, so they narrow the scope and never widen it.
 */
function buildClassContextWhere(
  filters: GeneralEducationFilters
): Prisma.CourseAssignmentWhereInput {
  return {
    ...(filters.courseId ? { course_id: filters.courseId } : {}),
    ...(filters.programId ? { program_id: filters.programId } : {}),
    ...(filters.yearLevel ? { year_level: filters.yearLevel } : {}),
  };
}

/** The authorized, filter-resolved evidence scope every read agrees on. */
type GeneralEducationReadScope = {
  periodLabel: string | null;
  responseScope: Prisma.ResponseWhereInput;
  opportunityScope: Prisma.EvaluationAssignmentWhereInput;
  /**
   * Course-assignment predicate narrowed by the same period and class-context
   * facets as the evidence reads. Structural reads — ILO alignment coverage
   * and filter options — reuse it so a course can be aligned to an ILO before
   * any evaluation of it exists.
   */
  courseAssignmentScope: Prisma.CourseAssignmentWhereInput;
};

/**
 * Resolve the period filter and the General Education predicates. A period
 * filter that resolves to nothing collapses to the impossible-term sentinel, so
 * the reads return an empty scope instead of silently widening to all periods.
 */
const resolveGeneralEducationReadScope = cache(async function resolveGeneralEducationReadScope(
  scopeKey: string
): Promise<GeneralEducationReadScope> {
  const filters = parseGeneralEducationAnalyticsSearchParams(
    Object.fromEntries(new URLSearchParams(scopeKey))
  );
  const periodFilter = buildTermInstanceWhere(filters);
  const hasPeriodFilter = [filters.termInstanceId, filters.schoolYearId, filters.semester].some(
    Boolean
  );
  const instances = hasPeriodFilter
    ? await prisma.academicTermInstance.findMany({
        where: periodFilter,
        select: TERM_INSTANCE_SELECT,
      })
    : [];

  const schoolYearLabel = await resolveSchoolYearLabel(filters.schoolYearId, instances);

  const courseAssignmentWhere: Prisma.CourseAssignmentWhereInput = {
    ...generalEducationCourseAssignmentWhere(),
    ...buildClassContextWhere(filters),
  };
  // One resolved term set feeds both the evidence predicates and the
  // structural reads, so alignment coverage can never describe a different
  // academic scope than the evidence rows beside it.
  const termInstanceId = hasPeriodFilter
    ? {
        in:
          instances.length > 0
            ? instances.map((instance) => instance.id)
            : [IMPOSSIBLE_TERM_INSTANCE_ID],
      }
    : undefined;
  const periodScope = termInstanceId ? { term_instance_id: termInstanceId } : {};
  const courseBound = { course_assignment: courseAssignmentWhere, ...periodScope };

  return {
    periodLabel: buildPeriodLabel(filters, schoolYearLabel, instances),
    responseScope: {
      status: ResponseStatus.SUBMITTED,
      deployment_type: "COURSE_BOUND",
      assignment: { course_bound: courseBound },
    },
    opportunityScope: { course_bound: courseBound },
    courseAssignmentScope: {
      ...courseAssignmentWhere,
      ...periodScope,
    },
  };
});

/** Deployment projection shared by rating, response, and opportunity reads. */
const COURSE_BOUND_EVIDENCE_SELECT = {
  id: true,
  deployment_name: true,
  term_instance_id: true,
  instrument_version_id: true,
  course_assignment: {
    select: {
      year_level: true,
      section: true,
      faculty: { select: { name: true } },
      course: { select: { id: true, code: true, title: true } },
      program: { select: { id: true, code: true, name: true } },
    },
  },
} as const;

/** Evaluation-scoped question identity, resolved independently of any foreign key. */
function questionKey(evaluationId: string, sectionKey: string, itemKey: string): string {
  return encodeBindingKey(evaluationId, sectionKey, itemKey);
}

function addIdToList(byEvaluation: Map<string, string[]>, key: string, value: string): void {
  const values = byEvaluation.get(key) ?? [];
  if (!values.includes(value)) values.push(value);
  byEvaluation.set(key, values);
}

function indexEvidenceBindings(
  bindings: readonly GeCiloBindingRow[],
  ciloOrderByCourse: ReadonlyMap<string, string[]>
) {
  const bindingByQuestion = new Map<string, GeCiloBindingRow>();
  const outcomeIdsByQuestion = new Map<string, readonly GeIloMappingRow[]>();
  const ciloIdsByEvaluation = new Map<string, string[]>();
  const ciloLabelsByEvaluation = new Map<string, Map<string, string>>();
  for (const binding of bindings) {
    const evaluationId = binding.course_bound_evaluation_id;
    const key = questionKey(evaluationId, binding.section_key, binding.item_key);
    if (!bindingByQuestion.has(key)) bindingByQuestion.set(key, binding);
    if (binding.cilo) addIdToList(ciloIdsByEvaluation, evaluationId, binding.cilo.id);
    if (!ciloLabelsByEvaluation.has(evaluationId)) {
      const orderedCiloIds =
        ciloOrderByCourse.get(binding.course_bound_evaluation.course_assignment.course.id) ?? [];
      ciloLabelsByEvaluation.set(
        evaluationId,
        resolveCiloLabels(binding.course_bound_evaluation.cilos_snapshot, orderedCiloIds)
      );
    }
    outcomeIdsByQuestion.set(key, binding.cilo?.cilo_institutional_outcome_mappings ?? []);
  }
  return { bindingByQuestion, outcomeIdsByQuestion, ciloIdsByEvaluation, ciloLabelsByEvaluation };
}

/**
 * Read and normalize the authorized quantitative evidence for one filter set.
 *
 * Ratings bind to their CILO question by evaluation plus section/item keys
 * rather than `cilo_question_binding_id`, because the live student submission
 * flow writes ratings without that foreign key. Instrument snapshots load once
 * per distinct instrument version, and CILO publication labels come from each
 * evaluation's frozen `cilos_snapshot`, so a CILO keeps its publication-time
 * label however many questions evidence it.
 */
const readGeneralEducationEvidence = cache(async function readGeneralEducationEvidence(
  scopeKey: string
): Promise<GeneralEducationEvidence> {
  const scope = await resolveGeneralEducationReadScope(scopeKey);
  const [ratingSelectRows, responseSelectRows, assignmentRows] = await Promise.all([
    prisma.quantitativeResponseItem.findMany({
      where: { response: scope.responseScope },
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
                course_bound: { select: COURSE_BOUND_EVIDENCE_SELECT },
              },
            },
          },
        },
      },
    }),
    prisma.response.findMany({
      where: scope.responseScope,
      select: {
        id: true,
        assignment: { select: { course_bound: { select: COURSE_BOUND_EVIDENCE_SELECT } } },
      },
    }),
    prisma.evaluationAssignment.findMany({
      where: scope.opportunityScope,
      select: {
        course_bound: {
          select: {
            id: true,
            term_instance_id: true,
            deployment_name: true,
            instrument_version_id: true,
            course_assignment: {
              select: {
                year_level: true,
                section: true,
                faculty: { select: { name: true } },
                course: { select: { id: true, code: true, title: true } },
                program: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const courseBoundByRow = [
    ...ratingSelectRows.map((row) => row.response.assignment.course_bound),
    ...responseSelectRows.map((row) => row.assignment.course_bound),
    ...assignmentRows.map((row) => row.course_bound),
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  const evaluationIds = [...new Set(courseBoundByRow.map((row) => row.id))];
  const instrumentVersionIds = [
    ...new Set(
      courseBoundByRow
        .map((row) => row.instrument_version_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const courseIds = [...new Set(courseBoundByRow.map((row) => row.course_assignment.course.id))];

  const [bindings, instrumentVersions, courses] = await Promise.all([
    evaluationIds.length > 0
      ? prisma.courseBoundCiloQuestionBinding.findMany({
          where: { course_bound_evaluation_id: { in: evaluationIds } },
          select: {
            section_key: true,
            item_key: true,
            course_bound_evaluation_id: true,
            cilo_description_snapshot: true,
            cilo: {
              select: {
                id: true,
                description: true,
                course: { select: { id: true, code: true, title: true } },
                cilo_institutional_outcome_mappings: {
                  select: {
                    manifestation: true,
                    institutional_outcome: {
                      select: {
                        id: true,
                        code: true,
                        description: true,
                        order: true,
                        is_active: true,
                      },
                    },
                  },
                },
              },
            },
            course_bound_evaluation: {
              select: {
                cilos_snapshot: true,
                course_assignment: { select: { course: { select: { id: true } } } },
              },
            },
          },
        })
      : Promise.resolve([] as GeCiloBindingRow[]),
    instrumentVersionIds.length > 0
      ? prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: {
            id: true,
            structure_snapshot: true,
            version_number: true,
            template: { select: { name: true } },
          },
        })
      : Promise.resolve([] as GeInstrumentVersionRow[]),
    courseIds.length > 0
      ? prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: {
            id: true,
            cilos: { select: { id: true }, orderBy: { created_at: "asc" } },
          },
        })
      : Promise.resolve([] as Array<{ id: string; cilos: Array<{ id: string }> }>),
  ]);

  const snapshotById = new Map(
    instrumentVersions.map((version) => [version.id, version.structure_snapshot])
  );
  const instrumentLabels = new Map(
    instrumentVersions.map((version) => [version.id, instrumentVersionLabel(version)])
  );

  const ciloOrderByCourse = new Map(
    courses.map((course) => [course.id, course.cilos.map((cilo) => cilo.id)])
  );
  const deploymentsByEvaluation = new Map<string, string>();

  for (const row of courseBoundByRow) {
    deploymentsByEvaluation.set(row.id, row.deployment_name);
  }

  const { bindingByQuestion, outcomeIdsByQuestion, ciloIdsByEvaluation, ciloLabelsByEvaluation } =
    indexEvidenceBindings(bindings, ciloOrderByCourse);

  const ratingRows: GeRatingEvidence[] = ratingSelectRows.flatMap((row) => {
    const courseBound = row.response.assignment.course_bound;
    if (!courseBound) return [];
    const binding = bindingByQuestion.get(
      questionKey(courseBound.id, row.section_key, row.item_key)
    );
    return [
      {
        ratingValue: row.rating_value,
        responseId: row.response_id,
        sectionKey: row.section_key,
        itemKey: row.item_key,
        ciloId: binding?.cilo?.id ?? null,
        // A binding with no CILO row is an unmapped CILO, not a general item:
        // the frozen publication description proves the question was
        // CILO-bound when it was published.
        ciloDescription: binding?.cilo_description_snapshot ?? null,
        evaluationId: courseBound.id,
        deploymentName: courseBound.deployment_name,
        termInstanceId: courseBound.term_instance_id,
        instrumentVersionId: courseBound.instrument_version_id,
        course: { ...courseBound.course_assignment.course },
        classContext: {
          program: { ...courseBound.course_assignment.program },
          yearLevel: courseBound.course_assignment.year_level,
          section: courseBound.course_assignment.section,
          facultyName: courseBound.course_assignment.faculty.name,
        },
      },
    ];
  });

  const responseRows: GeResponseEvidence[] = responseSelectRows.flatMap((row) => {
    const courseBound = row.assignment.course_bound;
    if (!courseBound) return [];
    return [
      {
        responseId: row.id,
        evaluationId: courseBound.id,
        deploymentName: courseBound.deployment_name,
        termInstanceId: courseBound.term_instance_id,
        instrumentVersionId: courseBound.instrument_version_id,
        course: { ...courseBound.course_assignment.course },
        classContext: {
          program: { ...courseBound.course_assignment.program },
          yearLevel: courseBound.course_assignment.year_level,
          section: courseBound.course_assignment.section,
          facultyName: courseBound.course_assignment.faculty.name,
        },
      },
    ];
  });

  const assignments: GeAssignmentRow[] = assignmentRows.flatMap((row) => {
    const courseBound = row.course_bound;
    if (!courseBound) return [];
    return [
      {
        evaluationId: courseBound.id,
        deploymentName: courseBound.deployment_name,
        instrumentVersionId: courseBound.instrument_version_id,
        course: { ...courseBound.course_assignment.course },
        program: { ...courseBound.course_assignment.program },
        yearLevel: courseBound.course_assignment.year_level,
        section: courseBound.course_assignment.section,
        facultyName: courseBound.course_assignment.faculty.name,
        termInstanceId: courseBound.term_instance_id,
      },
    ];
  });

  return {
    ratingRows,
    responseRows,
    assignments,
    snapshotById,
    instrumentLabels,
    evaluationOpportunityCount: assignments.length,
    submittedResponseCount: responseRows.length,
    outcomeIdsByQuestion,
    ciloIdsByEvaluation,
    ciloLabelsByEvaluation,
    deploymentsByEvaluation,
  };
});

/** The college-wide ILO catalog, in published order, active and archived. */
const readIloCatalog = cache(async function readIloCatalog(): Promise<GeIloCatalogRow[]> {
  const rows = await prisma.institutionalOutcome.findMany({
    select: { id: true, code: true, description: true, order: true, is_active: true },
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
    order: row.order,
    isActive: row.is_active,
  }));
});

/**
 * Canonical scope key: the single identity every request-scoped read memoizes
 * on, so two views asking for the same evidence scope share one read within a
 * request and nothing is ever shared across requests.
 */
function evidenceScopeKey(filters: GeneralEducationFilters): string {
  return buildGeneralEducationAnalyticsQueryString(toGeneralEducationEvidenceScope(filters));
}

/** The ILO mappings one rating reaches, through its CILO's current mappings. */
function geOutcomeMappingsFor(
  evidence: GeneralEducationEvidence,
  row: GeRatingEvidence
): readonly GeIloMappingRow[] {
  return (
    evidence.outcomeIdsByQuestion.get(questionKey(row.evaluationId, row.sectionKey, row.itemKey)) ??
    []
  );
}

/** ILO ids one rating reaches; empty means the rating is unlinked evidence. */
function geOutcomeIdResolverFor(evidence: GeneralEducationEvidence): GeOutcomeIdResolver {
  return (row) =>
    geOutcomeMappingsFor(evidence, row).map((mapping) => mapping.institutional_outcome.id);
}

/**
 * Published ILO codes a rating reaches, for the trend series' outcome identity.
 * A period is comparable only when the same ILO codes underlie it, so the code
 * — not the row id — is what the fingerprint and the disclosure must carry.
 */
function geOutcomeCodeResolverFor(evidence: GeneralEducationEvidence): GeOutcomeIdResolver {
  return (row) =>
    geOutcomeMappingsFor(evidence, row).map((mapping) => mapping.institutional_outcome.code);
}

/** Structural ILO ids per course, for the Outcomes matrix alignment column. */
function alignedOutcomeIdsByCourseOf(
  alignments: readonly GeCiloIloAlignment[]
): Map<string, ReadonlySet<string>> {
  const byCourse = new Map<string, Set<string>>();
  for (const alignment of alignments) {
    const ids = byCourse.get(alignment.courseId) ?? new Set<string>();
    ids.add(alignment.outcomeId);
    byCourse.set(alignment.courseId, ids);
  }
  return byCourse;
}

/**
 * ILO chips per course, labelled from the published catalog. A chip names an
 * alignment that exists today, so a course can be listed against an ILO whose
 * evidence has not arrived yet.
 */
function alignedIlosByCourseOf(
  alignments: readonly GeCiloIloAlignment[],
  catalog: readonly GeIloCatalogRow[]
): Map<string, Array<{ id: string; code: string }>> {
  const codeByOutcomeId = new Map(catalog.map((ilo) => [ilo.id, ilo.code]));
  const byCourse = new Map<string, Map<string, string>>();
  for (const alignment of alignments) {
    const chips = byCourse.get(alignment.courseId) ?? new Map<string, string>();
    chips.set(alignment.outcomeId, codeByOutcomeId.get(alignment.outcomeId) ?? "");
    byCourse.set(alignment.courseId, chips);
  }
  return new Map(
    [...byCourse].map(([courseId, chips]) => [
      courseId,
      [...chips]
        .map(([id, code]) => ({ id, code }))
        .filter((chip) => chip.code.length > 0)
        .sort((left, right) => left.code.localeCompare(right.code)),
    ])
  );
}

/** Course-keyed evidence, shared by the frame, Courses, and trends reads. */
function courseEvidenceFor(evidence: GeneralEducationEvidence): Map<string, GeEvidenceAggregate> {
  return collectGeCourseEvidence(evidence.ratingRows, evidence.responseRows, evidence.snapshotById);
}

/**
 * Structural CILO-to-ILO alignment for the resolved scope: every active CILO
 * of an in-scope General Education course and every ILO it currently maps to.
 *
 * This read is deliberately independent of ratings, bindings, and evaluations,
 * so a course can be reported as aligned to an ILO before any evaluation of it
 * exists and a bound CILO whose ratings were all invalid still counts as
 * aligned. Manifestation rides along as a descriptive label only.
 */
const readGeneralEducationAlignments = cache(async function readGeneralEducationAlignments(
  scopeKey: string
): Promise<GeCiloIloAlignment[]> {
  const scope = await resolveGeneralEducationReadScope(scopeKey);
  // The mapping row's own ILO is the relation that carries the alignment; a
  // nested CILO-side listing would answer a different question.
  const mappings = await prisma.cILOInstitutionalOutcomeMapping.findMany({
    where: {
      institutional_outcome: { is_active: true },
      cilo: {
        is_active: true,
        course: {
          course_scope: "GENERAL_EDUCATION",
          course_assignments: { some: scope.courseAssignmentScope },
        },
      },
    },
    select: {
      manifestation: true,
      cilo: { select: { id: true, course_id: true } },
      institutional_outcome: { select: { id: true } },
    },
  });
  return mappings.map((mapping) => ({
    ciloId: mapping.cilo.id,
    courseId: mapping.cilo.course_id,
    outcomeId: mapping.institutional_outcome.id,
    manifestation: mapping.manifestation,
  }));
});

/** Whole-scope pooled evidence, folded from the course-keyed groups. */
function scopeEvidenceFor(evidence: GeneralEducationEvidence): GeEvidenceAggregate {
  const scope = emptyGeEvidenceAggregate();
  for (const aggregate of courseEvidenceFor(evidence).values()) {
    mergeGeEvidenceIntoScope(scope, aggregate);
  }
  return scope;
}

/** Scale-aware frame KPI. A mixed-scale scope reports no single mean. */
function buildFrameKpi(evidence: GeneralEducationEvidence): GeneralEducationAnalyticsKpi {
  const scope = scopeEvidenceFor(evidence);
  return {
    submittedResponseCount: evidence.submittedResponseCount,
    evaluationOpportunityCount: evidence.evaluationOpportunityCount,
    responseRate: geResponseRate(
      evidence.submittedResponseCount,
      evidence.evaluationOpportunityCount
    ),
    ratingCount: scope.ratingCount,
    meanRating: geEvidenceMean(scope),
    spansMultipleScales: geEvidenceSpansMultipleScales(scope),
    scaleContext: geEvidenceScaleContext(scope),
    excludedRatingCount: scope.excludedRatingCount,
  };
}

/** Filter options for the workspace's filter card, scoped to General Education. */
async function loadAnalyticsOptions(): Promise<GeneralEducationAnalyticsOptions> {
  const [assignments, periodInstances, iloCatalog] = await Promise.all([
    prisma.courseAssignment.findMany({
      where: generalEducationCourseAssignmentWhere(),
      select: {
        year_level: true,
        course: { select: { id: true, code: true, title: true } },
        program: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.academicTermInstance.findMany({ select: TERM_INSTANCE_SELECT }),
    readIloCatalog(),
  ]);

  const courses = new Map<string, string>();
  const programs = new Map<string, string>();
  const yearLevels = new Set<YearLevel>();
  for (const assignment of assignments) {
    courses.set(assignment.course.id, `${assignment.course.code} · ${assignment.course.title}`);
    programs.set(assignment.program.id, `${assignment.program.code} · ${assignment.program.name}`);
    yearLevels.add(assignment.year_level);
  }

  return {
    ...buildPeriodOptions(periodInstances),
    courses: [...courses]
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    programs: [...programs]
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    yearLevels: [...yearLevels]
      .sort()
      .map((value) => ({ value, label: getYearLevelDisplay(value) })),
    ilos: iloCatalog
      .filter((ilo) => ilo.isActive)
      .map((ilo) => ({ id: ilo.id, label: `${ilo.code} · ${ilo.description}` })),
  };
}

/**
 * Shared analytics frame: selected-scope KPI, empty-state precedence, and the
 * filter options. Authorized college-wide, General Education Course-bound
 * evidence only. Returns null for any non-Coordinator caller.
 */
export async function getGeneralEducationAnalyticsFrame(
  filters: GeneralEducationFilters
): Promise<GeneralEducationAnalyticsFrameDTO | null> {
  if (!(await requireGeneralEducationCoordinator())) return null;
  const [scope, options] = await Promise.all([
    resolveGeneralEducationReadScope(evidenceScopeKey(filters)),
    loadAnalyticsOptions(),
  ]);
  const evidence = await readGeneralEducationEvidence(evidenceScopeKey(filters));
  return {
    scope: { periodLabel: scope.periodLabel },
    kpi: buildFrameKpi(evidence),
    emptyReason: geScopeEmptyReason(
      evidence.evaluationOpportunityCount,
      evidence.submittedResponseCount
    ),
    options,
  };
}

/**
 * Institutional Learning Outcome evidence for the selected scope (ADR 0035).
 *
 * A rating reaches a CILO through its publication-time question binding and
 * then every ILO that CILO currently maps to; each response item contributes
 * once per `(response, evaluation, question, ILO)`. Valid ratings that reach no
 * ILO are reported as unlinked counts split between general items and unmapped
 * CILOs rather than dropped, and the catalog keeps every active ILO visible
 * even before any evidence reaches it. Means, exclusions, and mixed-scale
 * disclosure come from the shared outcome engine, so an ILO row behaves exactly
 * like a Program Head GO row.
 */
export async function getGeneralEducationOutcomes(
  filters: GeneralEducationFilters
): Promise<GeneralEducationOutcomesDTO | null> {
  if (!(await requireGeneralEducationCoordinator())) return null;
  const scopeKey = evidenceScopeKey(filters);
  const scope = await resolveGeneralEducationReadScope(scopeKey);
  const [evidence, iloCatalog, alignments, scopedCourses] = await Promise.all([
    readGeneralEducationEvidence(scopeKey),
    readIloCatalog(),
    readGeneralEducationAlignments(scopeKey),
    // Structural alignment can name a course with no evidence in this period,
    // so the matrix must be able to report it as aligned-without-evidence
    // rather than as unaligned.
    prisma.course.findMany({
      where: {
        course_scope: "GENERAL_EDUCATION",
        course_assignments: { some: scope.courseAssignmentScope },
      },
      select: {
        id: true,
        code: true,
        title: true,
        cilos: { select: { id: true }, orderBy: { created_at: "asc" } },
      },
    }),
  ]);
  const outcomeIdsOf = geOutcomeIdResolverFor(evidence);

  const outcomeRows: OutcomeEvidenceRow[] = evidence.ratingRows.flatMap((row) => {
    const mappings = geOutcomeMappingsFor(evidence, row);
    if (mappings.length === 0) return [];
    const ciloLabel =
      row.ciloId === null
        ? null
        : (evidence.ciloLabelsByEvaluation.get(row.evaluationId)?.get(row.ciloId) ?? "CILO");
    return [
      {
        ratingValue: row.ratingValue,
        responseId: row.responseId,
        sectionKey: row.sectionKey,
        itemKey: row.itemKey,
        instrumentVersion: {
          id: row.instrumentVersionId,
          structureSnapshot: evidence.snapshotById.get(row.instrumentVersionId) ?? null,
        },
        course: row.course,
        cilo:
          row.ciloId === null
            ? null
            : {
                id: row.ciloId,
                code: ciloLabel ?? "CILO",
                description: row.ciloDescription ?? "",
                course: row.course,
              },
        outcomeMappings: mappings.map((mapping) => ({
          outcomeId: mapping.institutional_outcome.id,
          code: mapping.institutional_outcome.code,
          name: mapping.institutional_outcome.description,
          manifestation: mapping.manifestation,
        })),
        directBindings: [],
        evaluationId: row.evaluationId,
        deploymentName: row.deploymentName,
      },
    ];
  });

  const aggregation = aggregateOutcomeEvidence(outcomeRows);
  const outcomes = mergeGeIloRows(iloCatalog, buildOutcomeEvidenceDtos(aggregation));
  const courseOutcomeEvidence = collectGeCourseOutcomeEvidence(
    evidence.ratingRows,
    outcomeIdsOf,
    evidence.snapshotById
  );
  const courses = new Map<string, GeCourseRef>();
  for (const row of evidence.ratingRows) courses.set(row.course.id, row.course);
  for (const row of evidence.assignments) courses.set(row.course.id, row.course);
  for (const course of scopedCourses) courses.set(course.id, course);

  const scopeEmptyReason = geScopeEmptyReason(
    evidence.evaluationOpportunityCount,
    evidence.submittedResponseCount
  );

  return {
    emptyReason:
      scopeEmptyReason ??
      (outcomes.some((outcome) => outcome.ratingCount > 0) ? null : "no-mapped-outcomes"),
    outcomes,
    currentMappingDisclosure: GE_CURRENT_MAPPING_DISCLOSURE,
    manyToManyDisclosure: aggregation.hasMultiMappedCilo,
    unlinkedRatings: summarizeUnlinkedRatings({
      ratingRows: evidence.ratingRows,
      outcomeIdsOf,
      isValidRating: (row) => isValidGeRating(row, evidence.snapshotById),
    }),
    alignmentCoverage: buildGeAlignmentCoverage({ outcomes, alignments }),
    courseMatrix: buildGeOutcomeCourseMatrix({
      courses: [...courses.values()],
      outcomes,
      courseOutcomeEvidence,
      alignedOutcomeIdsByCourse: alignedOutcomeIdsByCourseOf(alignments),
    }),
  };
}

/** True when a rating's value belongs to its item's frozen instrument scale. */
function isValidGeRating(
  row: GeRatingEvidence,
  snapshotById: ReadonlyMap<string, unknown>
): boolean {
  return ratingIsValid(
    resolveSnapshotItemScale(
      snapshotById.get(row.instrumentVersionId) ?? null,
      row.sectionKey,
      row.itemKey
    ),
    row.ratingValue
  );
}

/**
 * General Education course evidence for the selected scope: scale-separated
 * means and distributions, response rates against historical opportunities,
 * class-context section detail carrying Faculty context only, ILO chips, and a
 * comparable predecessor delta when one is defensible.
 */
export async function getGeneralEducationCourses(
  filters: GeneralEducationFilters
): Promise<GeneralEducationCoursesDTO | null> {
  if (!(await requireGeneralEducationCoordinator())) return null;
  const scopeKey = evidenceScopeKey(filters);
  const [evidence, alignments, iloCatalog] = await Promise.all([
    readGeneralEducationEvidence(scopeKey),
    readGeneralEducationAlignments(scopeKey),
    readIloCatalog(),
  ]);

  // A period-over-period comparison needs one selected period and a
  // chronological predecessor in the General Education series. Eligibility comes
  // from every period that published an in-scope evaluation, not from the
  // selected period's own evidence — otherwise a selected period is always its
  // own first eligible period and never has a predecessor to compare against.
  let previousComparable:
    | ReadonlyMap<string, { periodLabel: string; meanRating: number; change: number }>
    | undefined;
  const [instances, seriesTermInstanceIds] = await Promise.all([
    prisma.academicTermInstance.findMany({ select: TERM_INSTANCE_SELECT }),
    prisma.courseBoundEvaluation.findMany({
      where: {
        ...generalEducationCourseEvaluationWhere(),
        course_assignment: {
          ...generalEducationCourseAssignmentWhere(),
          ...buildClassContextWhere(filters),
        },
      },
      select: { term_instance_id: true },
      distinct: ["term_instance_id"],
    }),
  ]);
  const neighbor = resolveGePreviousComparablePeriod({
    termInstanceId: filters.termInstanceId ?? "",
    eligibleTermInstanceIds: new Set(seriesTermInstanceIds.map((row) => row.term_instance_id)),
    instances,
  });
  if (neighbor) {
    const previousFilters: GeneralEducationFilters = {
      ...filters,
      termInstanceId: neighbor.previous.id,
      schoolYearId: undefined,
      semester: undefined,
    };
    const previousEvidence = await readGeneralEducationEvidence(evidenceScopeKey(previousFilters));
    previousComparable = buildGeCoursePreviousComparable({
      current: courseEvidenceFor(evidence),
      previous: collectGeCourseEvidence(
        previousEvidence.ratingRows,
        previousEvidence.responseRows,
        previousEvidence.snapshotById
      ),
      previousLabel: buildInstancePeriodLabel(neighbor.previous),
    });
  }

  return {
    emptyReason: geScopeEmptyReason(
      evidence.evaluationOpportunityCount,
      evidence.submittedResponseCount
    ),
    rows: buildGeCourseRows({
      ratingRows: evidence.ratingRows,
      responseRows: evidence.responseRows,
      assignments: evidence.assignments,
      snapshotById: evidence.snapshotById,
      instrumentLabels: evidence.instrumentLabels,
      labels: {
        alignedIlosByCourse: alignedIlosByCourseOf(alignments, iloCatalog),
        yearLevelLabel: getYearLevelDisplay,
        sectionLabel: getSectionLabel,
      },
      previousComparable,
    }),
  };
}

/**
 * Class-context Program evidence for the selected scope. Program attribution
 * comes from the Course Assignment the evaluation ran in, never from a
 * respondent's Program membership, and Central evidence stays excluded.
 */
export async function getGeneralEducationPrograms(
  filters: GeneralEducationFilters
): Promise<GeneralEducationProgramsDTO | null> {
  if (!(await requireGeneralEducationCoordinator())) return null;
  const scopeKey = evidenceScopeKey(filters);
  const evidence = await readGeneralEducationEvidence(scopeKey);
  const { rows, courseMatrix } = buildGeProgramRows({
    ratingRows: evidence.ratingRows,
    responseRows: evidence.responseRows,
    assignments: evidence.assignments,
    snapshotById: evidence.snapshotById,
  });
  return {
    emptyReason: geScopeEmptyReason(
      evidence.evaluationOpportunityCount,
      evidence.submittedResponseCount
    ),
    attributionNote: GE_PROGRAM_ATTRIBUTION_NOTE,
    rows,
    courseMatrix,
  };
}

/**
 * Period series over the authorized scope. Only periods carrying evidence or
 * opportunities appear, so unrated and unsubmitted periods stay visible with a
 * null mean and an unavailable response rate instead of vanishing. An ILO
 * selection narrows rating evidence to that ILO's own questions while the
 * response-rate denominator stays the assignment population: narrowing the
 * numerator must not fabricate an ILO-specific denominator.
 */
export async function getGeneralEducationTrends(
  filters: GeneralEducationFilters
): Promise<GeneralEducationTrendsDTO | null> {
  if (!(await requireGeneralEducationCoordinator())) return null;
  const scopeKey = evidenceScopeKey(filters);
  const evidence = await readGeneralEducationEvidence(scopeKey);
  const outcomeIdsOf = geOutcomeIdResolverFor(evidence);
  const iloId = filters.iloId;
  const narrowedRows = iloId
    ? evidence.ratingRows.filter((row) => outcomeIdsOf(row).includes(iloId))
    : evidence.ratingRows;

  const instances = await prisma.academicTermInstance.findMany({ select: TERM_INSTANCE_SELECT });
  const periodEvidence = collectGePeriodEvidence(
    narrowedRows,
    evidence.responseRows,
    geOutcomeCodeResolverFor(evidence),
    evidence.snapshotById
  );
  const opportunities = summarizeGeOpportunities(evidence.assignments);

  return buildGeTrendSeries(
    buildGeTrendPeriodInputs({
      periodEvidence,
      opportunitiesByPeriod: opportunities.byPeriod,
      instancesById: new Map(instances.map((instance) => [instance.id, instance])),
      instrumentLabels: evidence.instrumentLabels,
      periodLabelOf: buildInstancePeriodLabel,
    })
  );
}

/**
 * Deterministic written-feedback structure for the selected scope. Identifier
 * redaction, tokenization, distinct-response counting, and tone banding run
 * inside the shared corpus analyzer, and only terms mentioned more than once
 * leave the server, globally and per prompt. Prompt groups keep their
 * instrument identity, so two versions sharing a prompt label never merge. The
 * payload is aggregate-only: no respondent, response, comment, or email crosses
 * this boundary.
 */
export async function getGeneralEducationFeedback(
  filters: GeneralEducationFilters
): Promise<GeneralEducationFeedbackDTO | null> {
  if (!(await requireGeneralEducationCoordinator())) return null;
  const scopeKey = evidenceScopeKey(filters);
  const scope = await resolveGeneralEducationReadScope(scopeKey);
  const [qualitativeRows, evidence] = await Promise.all([
    prisma.qualitativeResponseItem.findMany({
      where: { response: scope.responseScope },
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
                    instrument: {
                      select: {
                        id: true,
                        version_number: true,
                        structure_snapshot: true,
                        template: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    readGeneralEducationEvidence(scopeKey),
  ]);

  const items: QualitativeCorpusItem[] = qualitativeRows
    .filter((row) => row.text_content.trim().length > 0)
    .map((row) => {
      const courseBound = row.response.assignment.course_bound;
      const sourceKey = feedbackSourceKey({ courseBound });
      return {
        text: row.text_content,
        responseId: row.response.id,
        sourceKey,
        sourceLabel: FEEDBACK_SOURCE_LABELS[sourceKey],
        promptLabel: resolvePromptLabel(
          courseBound?.instrument.structure_snapshot,
          row.section_key,
          row.prompt_key
        ),
        // Section/item identity keeps two items that share a prompt label — or
        // the same item across instrument versions — from collapsing into one
        // prompt group.
        promptKey: encodeQuestionKey(row.section_key, row.prompt_key),
        instrumentId: courseBound?.instrument.id ?? "unknown-instrument",
        instrumentLabel: courseBound
          ? instrumentVersionLabel(courseBound.instrument)
          : "Unlabeled instrument",
      };
    });
  const corpus = analyzeQualitativeCorpus(items);
  const provenanceLabels = instrumentProvenanceLabels(corpus.prompts);
  const contributingEvaluations = new Set(
    qualitativeRows
      .map((row) => row.response.assignment.course_bound?.id)
      .filter((id): id is string => Boolean(id))
  );
  const scopeEmptyReason = geScopeEmptyReason(
    evidence.evaluationOpportunityCount,
    evidence.submittedResponseCount
  );

  return {
    emptyReason: scopeEmptyReason ?? (items.length === 0 ? "no-qualitative-evidence" : null),
    tokens: corpus.terms.filter((term) => term.mentions > 1).map(toTermToken),
    tone: corpus.tone,
    qualitativeItemCount: items.length,
    qualitativeResponseCount: new Set(items.map((item) => item.responseId)).size,
    sourceLabel: FEEDBACK_SOURCE_LABELS.COURSE_STUDENT,
    promptCounts: corpus.prompts.map((prompt) => ({
      sourceLabel: prompt.sourceLabel,
      promptLabel: prompt.promptLabel,
      instrumentId: prompt.instrumentId,
      instrumentLabel: provenanceLabels.get(prompt.instrumentId) ?? prompt.instrumentLabel,
      promptKey: prompt.promptKey,
      itemCount: prompt.itemCount,
      responseCount: prompt.responseCount,
      tone: prompt.tone,
      terms: prompt.terms.filter((term) => term.mentions > 1).map(toTermToken),
    })),
    evidenceEvaluations: [...contributingEvaluations]
      .map((evaluationId) => ({
        evaluationId,
        deploymentName: evidence.deploymentsByEvaluation.get(evaluationId) ?? "",
      }))
      .sort(
        (left, right) =>
          left.deploymentName.localeCompare(right.deploymentName) ||
          left.evaluationId.localeCompare(right.evaluationId)
      ),
  };
}

/** Frozen snapshot prompt label for one qualitative answer. */
function resolvePromptLabel(snapshot: unknown, sectionKey: string, promptKey: string): string {
  if (!Array.isArray(snapshot)) return "Unlabeled prompt";
  const section = snapshot.find(
    (candidate) => isSnapshotSection(candidate) && candidate.key === sectionKey
  );
  if (!section || !isSnapshotSection(section)) return "Unlabeled prompt";
  return (
    getSnapshotSectionItems(section).find((item) => item.key === promptKey)?.prompt ??
    "Unlabeled prompt"
  );
}
