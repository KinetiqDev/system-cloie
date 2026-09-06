import { AcademicSemester, AcademicTerm, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import {
  parseCourseInfoSnapshot,
  resolveSnapshotNullableText,
  resolveSnapshotText,
} from "@/features/evaluations/services/course-info-snapshot";
import { groupRatingsByScale } from "../aggregators/quantitative";
import {
  describeScale,
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
import { buildRedactedWordCloudTokens } from "./qualitative-analytics";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
/**
 * Shared Faculty anonymity floor: the minimum number of distinct submitted
 * respondents (or rated responses on the dashboard) before any aggregate
 * evidence — quantitative or qualitative — may be displayed or interpreted.
 */
export const FACULTY_ANONYMIZED_EVIDENCE_MINIMUM_RESPONDENTS = 5;
export const FACULTY_QUALITATIVE_MINIMUM_RESPONDENTS =
  FACULTY_ANONYMIZED_EVIDENCE_MINIMUM_RESPONDENTS;

type EvaluationRow = Prisma.CourseBoundEvaluationGetPayload<{
  include: {
    course_assignment: {
      select: {
        id: true;
        year_level: true;
        section: true;
        course: { select: { id: true; code: true; title: true } };
        program: { select: { id: true; name: true } };
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
    instrument: { select: { id: true; structure_snapshot: true } };
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
  const session = await resolveAuthSession();
  if (!session) return { success: false, error: "Not authenticated" };
  if (session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty access required" };
  }

  try {
    const normalized = normalizeFacultyAnalyticsFilters(filters);
    const evaluations = await readAuthorizedEvaluations(session.userId, normalized);
    return { success: true, data: buildFacultyAnalyticsData(evaluations, normalized) };
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
          program: { select: { id: true, name: true } },
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
          program: { select: { id: true, name: true } },
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
      instrument: { select: { id: true, structure_snapshot: true } },
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
  const qualitativeTexts = submitted.flatMap(({ response }) =>
    response.qual_items.map((item) => item.text_content).filter((text) => text.trim().length > 0)
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
      submittedResponseCount: submitted.length,
      responseCount: qualitativeResponseCount,
      itemCount: qualitativeTexts.length,
      evaluationCount: new Set(
        submitted
          .filter(({ response }) =>
            response.qual_items.some((item) => item.text_content.trim().length > 0)
          )
          .map(({ evaluation }) => evaluation.id)
      ).size,
      tokens: qualitativeAvailable
        ? buildRedactedWordCloudTokens(qualitativeTexts).filter((token) => token.value > 1)
        : [],
      promptCounts: qualitativeAvailable ? buildPromptCounts(submitted) : [],
    },
  };
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
  const rows = evaluations.map((evaluation) => {
    const submitted = evaluation.assignments.flatMap((assignment) =>
      assignment.response?.status === "SUBMITTED" ? [assignment.response] : []
    );
    const entries = submitted.flatMap((response) =>
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
    return { evaluation, submitted, groups };
  });

  const previousByCourse = new Map<string, { instrumentId: string; scaleKey: string | null }>();
  return rows.map(({ evaluation, submitted, groups }) => {
    const courseId = evaluation.course_assignment.course.id;
    const scaleKey = groups.length === 1 ? (groups[0].scale?.key ?? null) : null;
    const previous = previousByCourse.get(courseId);
    const sameInstrument = previous?.instrumentId === evaluation.instrument.id;
    const sameScale = previous?.scaleKey === scaleKey;
    const comparableWithPrevious = previous ? sameInstrument && sameScale : true;
    const breakReason = previous
      ? !sameInstrument
        ? "The published instrument version changed."
        : !sameScale
          ? "The rating scale changed."
          : null
      : null;
    previousByCourse.set(courseId, { instrumentId: evaluation.instrument.id, scaleKey });
    return {
      key: evaluation.id,
      courseId,
      courseCode: courseCode(evaluation),
      periodLabel: periodLabel(evaluation),
      mean: groups.length === 1 ? groups[0].metric.mean : null,
      responseCount: submitted.length,
      ratingCount: groups.length === 1 ? groups[0].metric.ratingCount : 0,
      scaleLabel:
        groups.length === 1 && groups[0].scale ? describeScale(groups[0].scale.descriptors) : null,
      comparableWithPrevious,
      breakReason,
    };
  });
}

function buildPromptCounts(
  submitted: Array<{
    response: EvaluationRow["assignments"][number]["response"] & {};
    evaluation: EvaluationRow;
  }>
) {
  const rows = new Map<string, { itemCount: number; responseIds: Set<string> }>();
  for (const { evaluation, response } of submitted) {
    const prompts = new Map<string, string>();
    if (Array.isArray(evaluation.instrument.structure_snapshot)) {
      for (const section of evaluation.instrument.structure_snapshot.filter(isSnapshotSection)) {
        for (const item of getSnapshotSectionItems(section)) {
          if (item.kind === "qualitative") prompts.set(`${section.key}:${item.key}`, item.prompt);
        }
      }
    }
    for (const item of response.qual_items) {
      if (!item.text_content.trim()) continue;
      const prompt = prompts.get(`${item.section_key}:${item.prompt_key}`) ?? "Written feedback";
      const row = rows.get(prompt) ?? { itemCount: 0, responseIds: new Set<string>() };
      row.itemCount += 1;
      row.responseIds.add(response.id);
      rows.set(prompt, row);
    }
  }
  return [...rows.entries()]
    .map(([prompt, value]) => ({
      prompt,
      itemCount: value.itemCount,
      responseCount: value.responseIds.size,
    }))
    .sort(
      (left, right) => right.itemCount - left.itemCount || left.prompt.localeCompare(right.prompt)
    );
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
    program: { name: string };
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
  const year = resolveSnapshotText(
    snapshot,
    "yearLevel",
    evaluation.course_assignment.year_level
  ).replaceAll("_", " ");
  const section = resolveSnapshotText(
    snapshot,
    "section",
    evaluation.course_assignment.section
  ).replaceAll("_", " ");
  return `${evaluation.course_assignment.program.name} · ${year} · ${section}`;
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
