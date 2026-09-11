import {
  AcademicSemester,
  AcademicTerm,
  StudentSection,
  YearLevel,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import {
  parseCourseInfoSnapshot,
  resolveSnapshotNullableText,
  resolveSnapshotText,
} from "@/features/evaluations/services/course-info-snapshot";
import { groupRatingsByScale } from "../aggregators/quantitative";
import {
  buildScaleIdentities,
  describeScale,
  extractDistinctScales,
  ratingBelongsToScale,
  resolveItemScaleIdentity,
  type ScaleIdentity,
} from "../aggregators/scale-identity";
import type { QuantitativeMetric } from "../aggregators/types";
import {
  FACULTY_ANALYTICS_VIEWS,
  type FacultyAnalyticsData,
  FacultyAnalyticsEvaluationItem,
  FacultyAnalyticsFilters,
  FacultyAnalyticsOptions,
  FacultyCiloMetric,
  FacultyQuestionMetric,
  FacultyScaleDistribution,
  FacultyTrendPoint,
  GetFacultyAnalyticsDataResult,
} from "../types";
import {
  FEEDBACK_SOURCE_LABELS,
  analyzeQualitativeCorpus,
  instrumentVersionLabel,
  toTermToken,
  type QualitativeCorpusItem,
} from "./qualitative-analytics";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
/**
 * Shared Faculty anonymity floor: the minimum number of distinct submitted
 * respondents (or rated responses on the dashboard) before any aggregate
 * evidence — quantitative or qualitative — may be displayed or interpreted.
 */
export const FACULTY_ANONYMIZED_EVIDENCE_MINIMUM_RESPONDENTS = 5;
const FACULTY_QUALITATIVE_MINIMUM_RESPONDENTS = FACULTY_ANONYMIZED_EVIDENCE_MINIMUM_RESPONDENTS;

type EvaluationRow = Prisma.CourseBoundEvaluationGetPayload<{
  include: {
    course_assignment: {
      select: {
        id: true;
        year_level: true;
        section: true;
        course: { select: { id: true; code: true; title: true } };
        program: { select: { id: true; code: true; name: true } };
      };
    };
    assignments: {
      select: {
        respondent_id: true;
        response: {
          select: {
            id: true;
            status: true;
            quant_items: {
              select: {
                rating_value: true;
                section_key: true;
                item_key: true;
                cilo_question_binding_id: true;
              };
            };
            qual_items: {
              select: { section_key: true; prompt_key: true; text_content: true };
            };
          };
        };
      };
    };
    cilo_question_bindings: true;
    instrument: {
      select: {
        id: true;
        version_number: true;
        structure_snapshot: true;
        template: { select: { name: true } };
      };
    };
    term_instance: {
      select: {
        id: true;
        semester: true;
        term: true;
        start_date: true;
        school_year: { select: { code: true } };
      };
    };
    _count: { select: { assignments: true } };
  };
}>;
type RatingEntry = {
  responseId: string;
  value: number;
  sectionKey: string;
  itemKey: string;
  scale: ScaleIdentity | null;
  evaluation: EvaluationRow;
};

export function normalizeFacultyAnalyticsFilters(
  filters: Partial<FacultyAnalyticsFilters>
): FacultyAnalyticsFilters {
  return {
    view: FACULTY_ANALYTICS_VIEWS.includes(filters.view as (typeof FACULTY_ANALYTICS_VIEWS)[number])
      ? (filters.view as (typeof FACULTY_ANALYTICS_VIEWS)[number])
      : "overview",
    ...(filters.termInstanceId ? { termInstanceId: filters.termInstanceId } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.assignmentId ? { assignmentId: filters.assignmentId } : {}),
    ...(filters.evaluationId ? { evaluationId: filters.evaluationId } : {}),
    ...(filters.status === "ACTIVE" || filters.status === "CLOSED"
      ? { status: filters.status }
      : {}),
  };
}

export async function getFacultyAnalyticsData(
  filters: Partial<FacultyAnalyticsFilters> = {}
): Promise<GetFacultyAnalyticsDataResult> {
  const result = await getFacultyAnalyticsDataWithPrincipal(filters);
  if (!result.success) return result;
  return { success: true, data: result.data };
}

export async function getFacultyAnalyticsDataWithPrincipal(
  filters: Partial<FacultyAnalyticsFilters> = {}
): Promise<
  | { success: true; data: FacultyAnalyticsData; facultyUserId: string }
  | { success: false; error: string }
> {
  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty access required" };
  }

  try {
    const normalized = normalizeFacultyAnalyticsFilters(filters);
    const evaluations = await readAuthorizedEvaluations(session.userId, normalized);
    return {
      success: true,
      data: buildFacultyAnalyticsData(evaluations, normalized),
      facultyUserId: session.userId,
    };
  } catch (error) {
    console.error("getFacultyAnalyticsData error:", error);
    return { success: false, error: "Failed to load analytics data" };
  }
}

export async function getFacultyAnalyticsOptions(): Promise<
  { success: true; options: FacultyAnalyticsOptions } | { success: false; error: string }
> {
  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty access required" };
  }
  try {
    const evaluations = await readAuthorizedEvaluationOptions(session.userId, {
      courseId: undefined,
      termInstanceId: undefined,
    });
    const items: FacultyAnalyticsEvaluationItem[] = evaluations.map((evaluation) => {
      const submitted = evaluation.assignments.filter(
        (assignment) => assignment.response?.status === "SUBMITTED"
      ).length;
      return {
        id: evaluation.id,
        deploymentName: evaluation.deployment_name,
        assignmentId: evaluation.course_assignment_id,
        courseId: evaluation.course_assignment.course.id,
        courseCode: courseCode(evaluation),
        courseTitle: courseTitle(evaluation),
        classLabel: classLabel(evaluation),
        programName: evaluation.course_assignment.program.name,
        termInstanceId: evaluation.term_instance.id,
        termInstanceLabel: periodLabel(evaluation),
        status: evaluation.status,
        responseCount: submitted,
        opportunityCount: evaluation._count.assignments,
      };
    });
    return {
      success: true,
      options: {
        terms: uniqueBy(
          evaluations.map((evaluation) => ({
            id: evaluation.term_instance.id,
            label: periodLabel(evaluation),
          })),
          (item) => item.id
        ),
        courses: uniqueBy(
          evaluations.map((evaluation) => ({
            id: evaluation.course_assignment.course.id,
            label: `${courseCode(evaluation)} · ${courseTitle(evaluation)}`,
          })),
          (item) => item.id
        ),
        assignments: uniqueBy(
          evaluations.map((evaluation) => ({
            id: evaluation.course_assignment_id,
            courseId: evaluation.course_assignment.course.id,
            termInstanceId: evaluation.term_instance.id,
            label: `${courseCode(evaluation)} · ${classLabel(evaluation)} · ${periodLabel(evaluation)}`,
          })),
          (item) => item.id
        ),
        evaluations: items,
      },
    };
  } catch (error) {
    console.error("getFacultyAnalyticsOptions error:", error);
    return { success: false, error: "Failed to load analytics filters" };
  }
}

/**
 * Dropdown-only projection. It deliberately excludes response and qualitative
 * rows: building filter options must never read raw answer content.
 */
async function readAuthorizedEvaluationOptions(
  userId: string,
  filters: Pick<FacultyAnalyticsFilters, "courseId" | "termInstanceId">
) {
  return prisma.courseBoundEvaluation.findMany({
    where: {
      course_assignment: {
        faculty_id: userId,
        ...(filters.courseId ? { course_id: filters.courseId } : {}),
      },
      ...(filters.termInstanceId ? { term_instance_id: filters.termInstanceId } : {}),
      status: { in: ["ACTIVE", "CLOSED"] },
    },
    orderBy: [{ term_instance: { start_date: "asc" } }, { published_at: "asc" }],
    select: {
      id: true,
      deployment_name: true,
      status: true,
      course_assignment_id: true,
      course_info_snapshot: true,
      course_assignment: {
        select: {
          id: true,
          year_level: true,
          section: true,
          course: { select: { id: true, code: true, title: true } },
          program: { select: { id: true, code: true, name: true } },
        },
      },
      term_instance: {
        select: {
          id: true,
          semester: true,
          term: true,
          start_date: true,
          school_year: { select: { code: true } },
        },
      },
      _count: { select: { assignments: true } },
      assignments: {
        select: {
          respondent_id: true,
          response: { select: { status: true } },
        },
      },
    },
  });
}
async function readAuthorizedEvaluations(userId: string, filters: FacultyAnalyticsFilters) {
  return prisma.courseBoundEvaluation.findMany({
    where: {
      course_assignment: {
        faculty_id: userId,
        ...(filters.courseId ? { course_id: filters.courseId } : {}),
      },
      ...(filters.termInstanceId ? { term_instance_id: filters.termInstanceId } : {}),
      ...(filters.assignmentId ? { course_assignment_id: filters.assignmentId } : {}),
      ...(filters.evaluationId ? { id: filters.evaluationId } : {}),
      ...(filters.status ? { status: filters.status } : { status: { in: ["ACTIVE", "CLOSED"] } }),
    },
    orderBy: [{ term_instance: { start_date: "asc" } }, { published_at: "asc" }],
    include: {
      course_assignment: {
        select: {
          id: true,
          year_level: true,
          section: true,
          course: { select: { id: true, code: true, title: true } },
          program: { select: { id: true, code: true, name: true } },
        },
      },
      assignments: {
        select: {
          respondent_id: true,
          response: {
            select: {
              id: true,
              status: true,
              quant_items: {
                select: {
                  rating_value: true,
                  section_key: true,
                  item_key: true,
                  cilo_question_binding_id: true,
                },
              },
              qual_items: {
                select: { section_key: true, prompt_key: true, text_content: true },
              },
            },
          },
        },
      },
      cilo_question_bindings: { orderBy: { created_at: "asc" } },
      instrument: {
        select: {
          id: true,
          version_number: true,
          structure_snapshot: true,
          template: { select: { name: true } },
        },
      },
      term_instance: {
        select: {
          id: true,
          semester: true,
          term: true,
          start_date: true,
          school_year: { select: { code: true } },
        },
      },
      _count: { select: { assignments: true } },
    },
  });
}

// Aggregate DTO assembles submitted/ratings/scales/opportunities/qualitative floor in one
// evidence contract; splitting would scatter the aggregate-only and anonymity guarantees.
// fallow-ignore-next-line complexity
function buildFacultyAnalyticsData(
  evaluations: EvaluationRow[],
  filters: FacultyAnalyticsFilters
): FacultyAnalyticsData {
  const submitted = evaluations.flatMap((evaluation) =>
    evaluation.assignments.flatMap((assignment) =>
      assignment.response?.status === "SUBMITTED"
        ? [{ evaluation, response: assignment.response, respondentId: assignment.respondent_id }]
        : []
    )
  );
  const ratings: RatingEntry[] = submitted.flatMap(({ evaluation, response }) =>
    response.quant_items.map((item) => ({
      responseId: response.id,
      value: item.rating_value,
      sectionKey: item.section_key,
      itemKey: item.item_key,
      scale: resolveItemScaleIdentity(
        evaluation.instrument.structure_snapshot,
        item.section_key,
        item.item_key
      ),
      evaluation,
    }))
  );
  const excludedRatingCount = ratings.filter(
    (rating) => !rating.scale || !ratingBelongsToScale(rating.scale, rating.value)
  ).length;
  const validRatings = ratings.filter(
    (rating) => rating.scale && ratingBelongsToScale(rating.scale, rating.value)
  );
  const scaleGroups = groupRatingsByScale(
    validRatings.map((entry) => ({
      rating: { value: entry.value, responseId: entry.responseId },
      scale: entry.scale,
    }))
  );
  const opportunityCount = evaluations.reduce(
    (total, evaluation) => total + evaluation._count.assignments,
    0
  );
  const distinctSubmittedRespondentCount = new Set(
    submitted.map(({ respondentId }) => respondentId)
  ).size;
  const qualitativeResponseCount = new Set(
    submitted
      .filter(({ response }) =>
        response.qual_items.some((item) => item.text_content.trim().length > 0)
      )
      .map(({ response }) => response.id)
  ).size;
  const qualitativeAvailable =
    distinctSubmittedRespondentCount >= FACULTY_QUALITATIVE_MINIMUM_RESPONDENTS;
  // Below the confidentiality floor the corpus is never analyzed, so no
  // qualitative derivation exists to leak or to reuse.
  const qualitativeItems: QualitativeCorpusItem[] = qualitativeAvailable
    ? submitted.flatMap(({ evaluation, response }) =>
        response.qual_items
          .filter((item) => item.text_content.trim().length > 0)
          .map((item) => ({
            text: item.text_content,
            responseId: response.id,
            sourceKey: "COURSE_STUDENT" as const,
            sourceLabel: FEEDBACK_SOURCE_LABELS.COURSE_STUDENT,
            promptLabel: qualitativePromptLabel(evaluation, item.section_key, item.prompt_key),
            instrumentId: evaluation.instrument.id,
            instrumentLabel: instrumentVersionLabel(evaluation.instrument),
          }))
      )
    : [];
  const qualitativeEvidence = qualitativeAvailable
    ? analyzeQualitativeCorpus(qualitativeItems)
    : null;

  return {
    filters,
    scopeLabel: buildScopeLabel(evaluations, submitted.length),
    evaluations: evaluations.map(toEvaluationItem),
    kpi: {
      submittedResponseCount: submitted.length,
      opportunityCount,
      responseRate: opportunityCount === 0 ? null : submitted.length / opportunityCount,
      validRatingCount: validRatings.length,
      overallMean: scaleGroups.length === 1 ? scaleGroups[0].metric.mean : null,
      overallScaleLabel:
        scaleGroups.length === 1 && scaleGroups[0].scale
          ? describeScale(scaleGroups[0].scale.descriptors)
          : null,
      overallScaleMax: scaleGroups.length === 1 ? (scaleGroups[0].scale?.max ?? null) : null,
      spansMultipleScales: scaleGroups.length > 1,
    },
    ratingDistributions: scaleGroups.map(({ scale, metric }) =>
      toScaleDistribution(scale, metric, excludedRatingCount)
    ),
    ciloMetrics: buildCiloMetrics(evaluations, validRatings),
    questionMetrics: buildQuestionMetrics(evaluations, validRatings),
    trends: buildTrends(evaluations),
    qualitative: {
      available: qualitativeAvailable,
      submittedResponseCount: qualitativeAvailable ? submitted.length : 0,
      responseCount: qualitativeAvailable ? qualitativeResponseCount : 0,
      itemCount: qualitativeEvidence ? qualitativeItems.length : 0,
      evaluationCount: qualitativeEvidence
        ? new Set(
            submitted
              .filter(({ response }) =>
                response.qual_items.some((item) => item.text_content.trim().length > 0)
              )
              .map(({ evaluation }) => evaluation.id)
          ).size
        : 0,
      tokens: qualitativeEvidence
        ? qualitativeEvidence.terms.filter((term) => term.mentions > 1).map(toTermToken)
        : [],
      tone: qualitativeEvidence?.tone ?? {
        scoredItemCount: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      promptCounts: qualitativeEvidence
        ? qualitativeEvidence.prompts
            .filter((prompt) => prompt.responseCount >= FACULTY_QUALITATIVE_MINIMUM_RESPONDENTS)
            .map((prompt) => ({
              prompt: prompt.promptLabel,
              instrumentLabel: prompt.instrumentLabel,
              itemCount: prompt.itemCount,
              responseCount: prompt.responseCount,
              tone: prompt.tone,
              terms: prompt.terms.filter((term) => term.mentions > 1).map(toTermToken),
            }))
        : [],
    },
  };
}

/** Snapshot prompt label for one qualitative answer, with a stable fallback. */
function qualitativePromptLabel(
  evaluation: EvaluationRow,
  sectionKey: string,
  promptKey: string
): string {
  if (!Array.isArray(evaluation.instrument.structure_snapshot)) {
    return "Written feedback";
  }

  for (const section of evaluation.instrument.structure_snapshot.filter(isSnapshotSection)) {
    if (section.key !== sectionKey) continue;
    for (const item of getSnapshotSectionItems(section)) {
      if (item.kind === "qualitative" && item.key === promptKey) {
        return item.prompt;
      }
    }
  }

  return "Written feedback";
}

function buildCiloMetrics(
  evaluations: EvaluationRow[],
  ratings: RatingEntry[]
): FacultyCiloMetric[] {
  return evaluations.flatMap((evaluation) =>
    evaluation.cilo_question_bindings.map((binding, index) => {
      const entries = ratings.filter(
        (rating) =>
          rating.evaluation.id === evaluation.id &&
          rating.sectionKey === binding.section_key &&
          rating.itemKey === binding.item_key
      );
      return {
        key: binding.id,
        ciloId: binding.cilo_id,
        label: `CILO ${index + 1}`,
        courseId: evaluation.course_assignment.course.id,
        courseCode: courseCode(evaluation),
        courseTitle: courseTitle(evaluation),
        evaluationId: evaluation.id,
        evaluationName: evaluation.deployment_name,
        description: binding.cilo_description_snapshot,
        questionPrompt: binding.question_prompt_snapshot,
        scaleGroups: metricGroups(entries),
      };
    })
  );
}

function buildQuestionMetrics(
  evaluations: EvaluationRow[],
  ratings: RatingEntry[]
): FacultyQuestionMetric[] {
  return evaluations.flatMap((evaluation) => {
    const bindings = new Map(
      evaluation.cilo_question_bindings.map((binding, index) => [
        `${binding.section_key}:${binding.item_key}`,
        `CILO ${index + 1}`,
      ])
    );
    if (!Array.isArray(evaluation.instrument.structure_snapshot)) return [];
    return evaluation.instrument.structure_snapshot.filter(isSnapshotSection).flatMap((section) =>
      getSnapshotSectionItems(section)
        .filter((item) => item.kind === "quantitative")
        .map((item) => ({
          key: `${evaluation.id}:${section.key}:${item.key}`,
          sectionTitle: section.title,
          prompt: item.prompt,
          ciloLabel: bindings.get(`${section.key}:${item.key}`) ?? null,
          scaleGroups: metricGroups(
            ratings.filter(
              (rating) =>
                rating.evaluation.id === evaluation.id &&
                rating.sectionKey === section.key &&
                rating.itemKey === item.key
            )
          ),
        }))
    );
  });
}

function metricGroups(entries: RatingEntry[]): FacultyScaleDistribution[] {
  const excludedByScale = entries.filter(
    (entry) => !entry.scale || !ratingBelongsToScale(entry.scale, entry.value)
  ).length;
  return groupRatingsByScale(
    entries
      .filter((entry) => entry.scale && ratingBelongsToScale(entry.scale, entry.value))
      .map((entry) => ({
        rating: { value: entry.value, responseId: entry.responseId },
        scale: entry.scale,
      }))
  ).map(({ scale, metric }) => toScaleDistribution(scale, metric, excludedByScale));
}

function toScaleDistribution(
  scale: ScaleIdentity | null,
  metric: QuantitativeMetric,
  excludedRatingCount: number
): FacultyScaleDistribution {
  return {
    scaleKey: scale?.key ?? "unresolved",
    scaleLabel: scale ? describeScale(scale.descriptors) : "Unresolved scale",
    scaleMin: scale?.min ?? 0,
    scaleMax: scale?.max ?? 0,
    mean: metric.mean,
    ratingCount: metric.ratingCount,
    responseCount: metric.responseCount,
    excludedRatingCount,
    categories: metric.distribution,
  };
}

function buildTrends(evaluations: EvaluationRow[]): FacultyTrendPoint[] {
  const byCoursePeriod = new Map<string, EvaluationRow[]>();
  for (const evaluation of evaluations) {
    const key = `${evaluation.course_assignment.course.id}:${evaluation.term_instance.id}`;
    const group = byCoursePeriod.get(key);
    if (group) group.push(evaluation);
    else byCoursePeriod.set(key, [evaluation]);
  }

  const periods = [...byCoursePeriod.values()].map((group) => {
    const first = group[0];
    const courseId = first.course_assignment.course.id;
    const termInstanceId = first.term_instance.id;
    const submitted = group.flatMap((evaluation) =>
      evaluation.assignments.flatMap((assignment) =>
        assignment.response?.status === "SUBMITTED"
          ? [{ evaluation, response: assignment.response }]
          : []
      )
    );
    const entries = submitted.flatMap(({ evaluation, response }) =>
      response.quant_items.flatMap((item) => {
        const scale = resolveItemScaleIdentity(
          evaluation.instrument.structure_snapshot,
          item.section_key,
          item.item_key
        );
        return scale && ratingBelongsToScale(scale, item.rating_value)
          ? [{ rating: { value: item.rating_value, responseId: response.id }, scale }]
          : [];
      })
    );
    const groups = groupRatingsByScale(entries);
    const ratedInstrumentIds = new Set<string>();
    for (const { evaluation, response } of submitted) {
      const contributes = response.quant_items.some((item) => {
        const scale = resolveItemScaleIdentity(
          evaluation.instrument.structure_snapshot,
          item.section_key,
          item.item_key
        );
        return scale !== null && ratingBelongsToScale(scale, item.rating_value);
      });
      if (contributes) ratedInstrumentIds.add(evaluation.instrument.id);
    }
    const snapshotByInstrument = new Map(
      group.map(
        (evaluation) =>
          [evaluation.instrument.id, evaluation.instrument.structure_snapshot] as const
      )
    );
    const scaleIdentities = buildScaleIdentities(
      [...ratedInstrumentIds].flatMap((id) => extractDistinctScales(snapshotByInstrument.get(id)))
    );
    const instrumentVersions = [...ratedInstrumentIds].sort();
    const mean = groups.length === 1 ? groups[0].metric.mean : null;
    return {
      key: `${courseId}:${termInstanceId}`,
      courseId,
      courseCode: courseCode(first),
      periodLabel: periodLabel(first),
      sortTime: (() => {
        const startDate = first.term_instance.start_date as unknown as Date | string | null;
        if (startDate instanceof Date) return startDate.getTime();
        if (startDate) return new Date(startDate).getTime();
        return 0;
      })(),
      mean,
      responseCount: submitted.length,
      ratingCount: groups.length === 1 ? groups[0].metric.ratingCount : 0,
      scaleLabel:
        groups.length === 1 && groups[0].scale ? describeScale(groups[0].scale.descriptors) : null,
      instrumentVersions,
      scaleIdentities,
    };
  });

  periods.sort(
    (left, right) =>
      left.sortTime - right.sortTime ||
      left.periodLabel.localeCompare(right.periodLabel) ||
      left.key.localeCompare(right.key)
  );

  const previousByCourse = new Map<
    string,
    { instrumentVersions: string[]; scaleIdentities: string[]; mean: number | null }
  >();
  // Trend comparability (same course + instrument + scale with stated breaks) is one
  // no-cross-course-join contract; splitting the row projection would scatter it.
  // Unrated periods never fabricate a break: they break the drawable run without a reason.
  // fallow-ignore-next-line complexity
  return periods.map((period) => {
    const previous = previousByCourse.get(period.courseId);
    const instrumentsEqual =
      previous !== undefined &&
      previous.instrumentVersions.length === period.instrumentVersions.length &&
      previous.instrumentVersions.every(
        (value, index) => value === period.instrumentVersions[index]
      );
    const scalesEqual =
      previous !== undefined &&
      previous.scaleIdentities.length === period.scaleIdentities.length &&
      previous.scaleIdentities.every((value, index) => value === period.scaleIdentities[index]);
    let comparableWithPrevious: boolean;
    let breakReason: string | null = null;
    if (!previous) {
      comparableWithPrevious = period.mean !== null;
    } else if (previous.mean === null || period.mean === null) {
      comparableWithPrevious = false;
    } else if (!instrumentsEqual) {
      comparableWithPrevious = false;
      breakReason = "The published instrument version changed.";
    } else if (!scalesEqual) {
      comparableWithPrevious = false;
      breakReason = "The rating scale changed.";
    } else {
      comparableWithPrevious = true;
    }
    previousByCourse.set(period.courseId, {
      instrumentVersions: period.instrumentVersions,
      scaleIdentities: period.scaleIdentities,
      mean: period.mean,
    });
    return {
      key: period.key,
      courseId: period.courseId,
      courseCode: period.courseCode,
      periodLabel: period.periodLabel,
      mean: period.mean,
      responseCount: period.responseCount,
      ratingCount: period.ratingCount,
      scaleLabel: period.scaleLabel,
      comparableWithPrevious,
      breakReason,
    };
  });
}

function toEvaluationItem(evaluation: EvaluationRow): FacultyAnalyticsEvaluationItem {
  const submitted = evaluation.assignments.filter(
    (assignment) => assignment.response?.status === "SUBMITTED"
  ).length;
  return {
    id: evaluation.id,
    deploymentName: evaluation.deployment_name,
    assignmentId: evaluation.course_assignment_id,
    courseId: evaluation.course_assignment.course.id,
    courseCode: courseCode(evaluation),
    courseTitle: courseTitle(evaluation),
    classLabel: classLabel(evaluation),
    programName: evaluation.course_assignment.program.name,
    termInstanceId: evaluation.term_instance_id,
    termInstanceLabel: periodLabel(evaluation),
    status: evaluation.status,
    responseCount: submitted,
    opportunityCount: evaluation._count.assignments,
  };
}

type SnapshotContextRow = {
  course_info_snapshot: unknown;
  course_assignment: {
    year_level: string;
    section: string;
    course: { code: string; title: string };
    program: { code: string; name: string };
  };
  term_instance: {
    id: string;
    semester: string;
    term: string | null;
    school_year: { code: string };
  };
};

function periodLabel(evaluation: SnapshotContextRow): string {
  const snapshot = parseCourseInfoSnapshot(evaluation.course_info_snapshot);
  return formatTermInstanceLabel(
    resolveSnapshotText(snapshot, "schoolYearCode", evaluation.term_instance.school_year.code),
    resolveSnapshotText(
      snapshot,
      "semester",
      evaluation.term_instance.semester
    ) as AcademicSemester,
    resolveSnapshotNullableText(
      snapshot,
      "term",
      evaluation.term_instance.term
    ) as AcademicTerm | null
  );
}

function courseCode(evaluation: SnapshotContextRow): string {
  return resolveSnapshotText(
    parseCourseInfoSnapshot(evaluation.course_info_snapshot),
    "courseCode",
    evaluation.course_assignment.course.code
  );
}

function courseTitle(evaluation: SnapshotContextRow): string {
  return resolveSnapshotText(
    parseCourseInfoSnapshot(evaluation.course_info_snapshot),
    "courseTitle",
    evaluation.course_assignment.course.title
  );
}

function classLabel(evaluation: SnapshotContextRow): string {
  const snapshot = parseCourseInfoSnapshot(evaluation.course_info_snapshot);
  const yearLevel = resolveSnapshotText(
    snapshot,
    "yearLevel",
    evaluation.course_assignment.year_level
  );
  const section = resolveSnapshotText(snapshot, "section", evaluation.course_assignment.section);
  return [
    resolveSnapshotText(snapshot, "programCode", evaluation.course_assignment.program.code),
    getYearLevelDisplay(normalizeEnumLabel(yearLevel) as YearLevel),
    getSectionLabel(normalizeEnumLabel(section) as StudentSection),
  ].join(" · ");
}

function normalizeEnumLabel(value: string): string {
  return value.trim().replaceAll(/\s+/g, "_").toUpperCase();
}

function buildScopeLabel(evaluations: EvaluationRow[], submittedResponseCount: number): string {
  if (evaluations.length === 0) return "No evaluation evidence matches this scope.";
  const courseCount = new Set(
    evaluations.map((evaluation) => evaluation.course_assignment.course.id)
  ).size;
  return `Showing ${evaluations.length} evaluation${evaluations.length === 1 ? "" : "s"} across ${courseCount} course${courseCount === 1 ? "" : "s"}, based on ${submittedResponseCount} submitted response${submittedResponseCount === 1 ? "" : "s"}.`;
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}
