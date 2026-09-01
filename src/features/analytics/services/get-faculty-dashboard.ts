import { DeploymentStatus, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { countEligibleCourseBoundEvaluationAssignments } from "@/features/course-assignments/services/course-assignment-roster";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { buildRedactedWordCloudTokens } from "./qualitative-analytics";
import { groupRatingsByScale } from "../aggregators/quantitative";
import {
  describeScale,
  resolveItemScaleIdentity,
  type ScaleIdentity,
} from "../aggregators/scale-identity";
import type { QuantitativeMetric, ScaleCategoryCount } from "../aggregators/types";
import type { WordCloudToken } from "../types";

export type FacultyCourseEvidence = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  evidenceHref: string;
  scaleLabel: string;
  scaleMin: number | null;
  scaleMax: number | null;
  mean: number;
  ratingCount: number;
  responseCount: number;
  distribution: ScaleCategoryCount[];
};

export type FacultyCourseOverviewItem = {
  assignmentId: string;
  courseCode: string;
  courseTitle: string;
  contextLabel: string;
  evaluationId: string | null;
  evaluationStatus: DeploymentStatus | null;
  rosterCount: number;
  assignedCount: number;
  submittedCount: number;
  deadlineAt: Date | null;
  mean: number | null;
  scaleLabel: string | null;
  spansMultipleScales: boolean;
};

export type FacultyUpcomingEvaluation = {
  evaluationId: string;
  courseCode: string;
  courseTitle: string;
  status: DeploymentStatus;
  deadlineAt: Date | null;
  assignedCount: number;
  submittedCount: number;
};

export type FacultyDashboardKPI = {
  activeEvaluations: number;
  scheduledEvaluations: number;
  closingWithin7Days: number;
  totalResponses: number;
  evaluationOpportunities: number;
  completionRate: number | null;
  overallMean: number | null;
  overallScaleLabel: string | null;
  overallScaleMax: number | null;
  overallRatingCount: number;
  spansMultipleScales: boolean;
  pendingResponses: number;
};

export type FacultyDashboardData = {
  programLabel: string;
  programCode: string;
  periodLabel: string | null;
  kpi: FacultyDashboardKPI;
  upcomingEvaluations: FacultyUpcomingEvaluation[];
  courseOverview: FacultyCourseOverviewItem[];
  courseEvidence: FacultyCourseEvidence[];
  wordCloudTokens: WordCloudToken[];
  qualitativeItemCount: number;
  qualitativeResponseCount: number;
  qualitativeEvaluationCount: number;
};

export type FacultyDashboardMetrics = Pick<
  FacultyDashboardData,
  "programLabel" | "programCode" | "periodLabel" | "kpi" | "upcomingEvaluations" | "courseOverview"
>;

export type FacultyDashboardVisualizations = Pick<
  FacultyDashboardData,
  | "courseEvidence"
  | "wordCloudTokens"
  | "qualitativeItemCount"
  | "qualitativeResponseCount"
  | "qualitativeEvaluationCount"
>;

type AuthorizedFacultyScope = { userId: string };
type ActivePeriod = {
  id: string;
  label: string;
};

type RatingEntry = {
  value: number;
  responseId: string;
  scale: ScaleIdentity | null;
};

type SubmittedResponse = {
  id: string;
  status: ResponseStatus;
  quant_items: Array<{ rating_value: number; section_key: string; item_key: string }>;
};

const MINIMUM_ANONYMIZED_RESPONSE_COUNT = 3;

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

async function authorizeFacultyDashboard(userId: string): Promise<AuthorizedFacultyScope | null> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.FACULTY || session.userId !== userId) return null;
  return { userId };
}

async function readActivePeriod(): Promise<ActivePeriod | null> {
  const period = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      semester: true,
      term: true,
      school_year: { select: { code: true } },
    },
  });
  if (!period) return null;
  return {
    id: period.id,
    label: formatTermInstanceLabel(period.school_year.code, period.semester, period.term),
  };
}

async function readFacultyDashboardMetrics(
  scope: AuthorizedFacultyScope,
  activePeriod: ActivePeriod | null
): Promise<FacultyDashboardMetrics> {
  const evaluationWhere = {
    course_assignment: { faculty_id: scope.userId },
    ...(activePeriod ? { term_instance_id: activePeriod.id } : { id: "__no_active_period__" }),
  };
  const now = new Date();

  const [affiliation, evaluations, pendingResponses, courseAssignments] = await Promise.all([
    prisma.facultyProgramAffiliation.findFirst({
      where: { faculty_id: scope.userId, is_active: true },
      include: { program: { select: { code: true, name: true } } },
    }),
    prisma.courseBoundEvaluation.findMany({
      where: evaluationWhere,
      select: {
        id: true,
        status: true,
        deadline_at: true,
        course_assignment_id: true,
        course_assignment: { select: { course: { select: { code: true, title: true } } } },
        assignments: {
          select: {
            response: {
              select: {
                id: true,
                status: true,
                quant_items: {
                  select: { rating_value: true, section_key: true, item_key: true },
                },
              },
            },
          },
        },
        instrument: { select: { structure_snapshot: true } },
      },
      orderBy: [{ deadline_at: "asc" }, { created_at: "desc" }],
    }),
    activePeriod
      ? countEligibleCourseBoundEvaluationAssignments({
          AND: [
            { OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }] },
            {
              course_bound: {
                course_assignment: { faculty_id: scope.userId },
                term_instance_id: activePeriod.id,
                status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
                OR: [{ activation_at: null }, { activation_at: { lte: now } }],
                AND: [{ OR: [{ deadline_at: null }, { deadline_at: { gte: now } }] }],
              },
            },
          ],
        })
      : Promise.resolve(0),
    prisma.courseAssignment.findMany({
      where: {
        faculty_id: scope.userId,
        is_active: true,
        ...(activePeriod ? { term_instance_id: activePeriod.id } : { id: "__no_active_period__" }),
      },
      select: {
        id: true,
        year_level: true,
        section: true,
        course: { select: { code: true, title: true } },
        memberships: { where: { is_active: true }, select: { id: true } },
      },
      orderBy: { course: { code: "asc" } },
    }),
  ]);

  const evaluationByAssignment = new Map(
    evaluations.map((evaluation) => [evaluation.course_assignment_id, evaluation])
  );
  const submittedResponses = collectSubmittedResponses(evaluations);
  const ratingEvidence = collectRatingEvidence(evaluations);
  const assignedCount = evaluations.reduce(
    (sum, evaluation) => sum + evaluation.assignments.length,
    0
  );
  const activeEvaluations = evaluations.filter(
    (evaluation) => evaluation.status === DeploymentStatus.ACTIVE
  );

  return {
    programLabel: affiliation?.program.name ?? "No active program affiliation",
    programCode: affiliation?.program.code ?? "—",
    periodLabel: activePeriod?.label ?? null,
    kpi: buildFacultyKpi({
      evaluations,
      activeEvaluations,
      submittedResponses,
      ratingEvidence,
      assignedCount,
      pendingResponses,
      now,
    }),
    upcomingEvaluations: buildUpcomingEvaluations(evaluations),
    courseOverview: buildCourseOverview(courseAssignments, evaluationByAssignment),
  };
}

type EvaluationRow = {
  id: string;
  status: DeploymentStatus;
  deadline_at: Date | null;
  course_assignment_id: string;
  course_assignment: { course: { code: string; title: string } };
  assignments: Array<{
    response: {
      id: string;
      status: ResponseStatus;
      quant_items: Array<{
        rating_value: number;
        section_key: string;
        item_key: string;
      }>;
    } | null;
  }>;
  instrument: { structure_snapshot: unknown };
};

function collectSubmittedResponses(evaluations: EvaluationRow[]): SubmittedResponse[] {
  return evaluations.flatMap((evaluation) =>
    evaluation.assignments.flatMap((assignment) =>
      assignment.response?.status === ResponseStatus.SUBMITTED ? [assignment.response] : []
    )
  );
}

type RatingEvidence = {
  resolvedEntries: RatingEntry[];
  scaleGroups: Array<{ scale: ScaleIdentity | null; metric: QuantitativeMetric }>;
  distinctRatedResponses: number;
  singleMetric: QuantitativeMetric | null;
};

function collectRatingEvidence(evaluations: EvaluationRow[]): RatingEvidence {
  const ratingEntries = evaluations.flatMap((evaluation) =>
    evaluation.assignments.flatMap((assignment) => {
      const response = assignment.response;
      if (!response || response.status !== ResponseStatus.SUBMITTED) return [];
      return response.quant_items.map((item) => ({
        value: item.rating_value,
        responseId: response.id,
        scale: resolveItemScaleIdentity(
          evaluation.instrument.structure_snapshot,
          item.section_key,
          item.item_key
        ),
      }));
    })
  );
  const resolvedEntries = ratingEntries.filter((entry) => entry.scale !== null);
  const scaleGroups = groupRatingsByScale(
    resolvedEntries.map((entry) => ({
      rating: { value: entry.value, responseId: entry.responseId },
      scale: entry.scale,
    }))
  );
  const distinctRatedResponses = new Set(resolvedEntries.map((entry) => entry.responseId)).size;
  const singleMetric =
    scaleGroups.length === 1 && distinctRatedResponses >= MINIMUM_ANONYMIZED_RESPONSE_COUNT
      ? scaleGroups[0].metric
      : null;
  return { resolvedEntries, scaleGroups, distinctRatedResponses, singleMetric };
}

// One KPI contract assembles period-scoped evaluation, response, and scale evidence with
// the anonymization floor; splitting it into per-metric writers would scatter the contract.
// fallow-ignore-next-line complexity
function buildFacultyKpi({
  evaluations,
  activeEvaluations,
  submittedResponses,
  ratingEvidence,
  assignedCount,
  pendingResponses,
  now,
}: {
  evaluations: EvaluationRow[];
  activeEvaluations: EvaluationRow[];
  submittedResponses: SubmittedResponse[];
  ratingEvidence: RatingEvidence;
  assignedCount: number;
  pendingResponses: number;
  now: Date;
}): FacultyDashboardKPI {
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { scaleGroups, resolvedEntries, distinctRatedResponses, singleMetric } = ratingEvidence;
  return {
    activeEvaluations: activeEvaluations.length,
    scheduledEvaluations: evaluations.filter(
      (evaluation) => evaluation.status === DeploymentStatus.SCHEDULED
    ).length,
    closingWithin7Days: activeEvaluations.filter(
      (evaluation) =>
        evaluation.deadline_at !== null &&
        evaluation.deadline_at >= now &&
        evaluation.deadline_at <= inSevenDays
    ).length,
    totalResponses: submittedResponses.length,
    evaluationOpportunities: assignedCount,
    completionRate: assignedCount === 0 ? null : submittedResponses.length / assignedCount,
    overallMean:
      singleMetric?.mean === null || singleMetric?.mean === undefined
        ? null
        : roundToTwo(singleMetric.mean),
    overallScaleLabel:
      singleMetric && scaleGroups[0].scale ? describeScale(scaleGroups[0].scale.descriptors) : null,
    overallScaleMax: singleMetric ? (scaleGroups[0].scale?.max ?? null) : null,
    overallRatingCount: singleMetric ? resolvedEntries.length : 0,
    spansMultipleScales:
      distinctRatedResponses >= MINIMUM_ANONYMIZED_RESPONSE_COUNT && scaleGroups.length > 1,
    pendingResponses,
  };
}

function buildUpcomingEvaluations(evaluations: EvaluationRow[]): FacultyUpcomingEvaluation[] {
  return evaluations
    .filter(
      (evaluation) =>
        evaluation.status === DeploymentStatus.ACTIVE ||
        evaluation.status === DeploymentStatus.SCHEDULED
    )
    .slice(0, 3)
    .map((evaluation) => ({
      evaluationId: evaluation.id,
      courseCode: evaluation.course_assignment.course.code,
      courseTitle: evaluation.course_assignment.course.title,
      status: evaluation.status,
      deadlineAt: evaluation.deadline_at,
      assignedCount: evaluation.assignments.length,
      submittedCount: evaluation.assignments.filter(
        (assignment) => assignment.response?.status === ResponseStatus.SUBMITTED
      ).length,
    }));
}

function buildCourseOverview(
  courseAssignments: Array<{
    id: string;
    year_level: string;
    section: string;
    course: { code: string; title: string };
    memberships: Array<{ id: string }>;
  }>,
  evaluationByAssignment: Map<string, EvaluationRow>
): FacultyCourseOverviewItem[] {
  return courseAssignments.map((assignment) => {
    const evaluation = evaluationByAssignment.get(assignment.id);
    return {
      assignmentId: assignment.id,
      contextLabel: `${assignment.year_level.replaceAll("_", " ")} · ${assignment.section.replaceAll("_", " ")}`,
      courseCode: assignment.course.code,
      courseTitle: assignment.course.title,
      rosterCount: assignment.memberships.length,
      assignedCount: evaluation?.assignments.length ?? 0,
      ...buildCourseOverviewEvidence(evaluation),
    };
  });
}

// One row projection keeps the evaluation and rating evidence for one course assignment together.
// fallow-ignore-next-line complexity
function buildCourseOverviewEvidence(
  evaluation: EvaluationRow | undefined
): Pick<
  FacultyCourseOverviewItem,
  | "evaluationId"
  | "evaluationStatus"
  | "submittedCount"
  | "deadlineAt"
  | "mean"
  | "scaleLabel"
  | "spansMultipleScales"
> {
  const entries = evaluation
    ? evaluation.assignments.flatMap((evaluationAssignment) => {
        const response = evaluationAssignment.response;
        if (!response || response.status !== ResponseStatus.SUBMITTED) return [];
        return response.quant_items.map((item) => ({
          rating: { value: item.rating_value, responseId: response.id },
          scale: resolveItemScaleIdentity(
            evaluation.instrument.structure_snapshot,
            item.section_key,
            item.item_key
          ),
        }));
      })
    : [];
  const resolvedEntries = entries.filter((entry) => entry.scale !== null);
  const groups = groupRatingsByScale(resolvedEntries);
  const distinctResponses = new Set(resolvedEntries.map((entry) => entry.rating.responseId)).size;
  const mayDisplayEvidence = distinctResponses >= MINIMUM_ANONYMIZED_RESPONSE_COUNT;
  return {
    evaluationId: evaluation?.id ?? null,
    evaluationStatus: evaluation?.status ?? null,
    submittedCount:
      evaluation?.assignments.filter(
        (evaluationAssignment) => evaluationAssignment.response?.status === ResponseStatus.SUBMITTED
      ).length ?? 0,
    deadlineAt: evaluation?.deadline_at ?? null,
    mean: mayDisplayEvidence && groups.length === 1 ? groups[0].metric.mean : null,
    scaleLabel:
      mayDisplayEvidence && groups.length === 1 && groups[0].scale
        ? describeScale(groups[0].scale.descriptors)
        : null,
    spansMultipleScales: mayDisplayEvidence && groups.length > 1,
  };
}

async function readFacultyDashboardVisualizations(
  scope: AuthorizedFacultyScope,
  activePeriod: ActivePeriod | null
): Promise<FacultyDashboardVisualizations> {
  if (!activePeriod) {
    return {
      courseEvidence: [],
      qualitativeItemCount: 0,
      qualitativeResponseCount: 0,
      qualitativeEvaluationCount: 0,
      wordCloudTokens: [],
    };
  }

  const [evaluations, qualitativeItems] = await Promise.all([
    prisma.courseBoundEvaluation.findMany({
      where: {
        course_assignment: { faculty_id: scope.userId },
        term_instance_id: activePeriod.id,
        status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.CLOSED] },
      },
      select: {
        id: true,
        instrument: { select: { structure_snapshot: true } },
        course_assignment: {
          select: { course: { select: { id: true, code: true, title: true } } },
        },
        assignments: {
          where: { response: { status: ResponseStatus.SUBMITTED } },
          select: {
            response: {
              select: {
                id: true,
                quant_items: {
                  select: { rating_value: true, section_key: true, item_key: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.qualitativeResponseItem.findMany({
      where: {
        response: {
          status: ResponseStatus.SUBMITTED,
          deployment_type: "COURSE_BOUND",
          assignment: {
            course_bound: {
              term_instance_id: activePeriod.id,
              course_assignment: { faculty_id: scope.userId },
            },
          },
        },
      },
      select: {
        text_content: true,
        response_id: true,
        response: { select: { assignment: { select: { course_bound_id: true } } } },
      },
    }),
  ]);

  return {
    courseEvidence: buildCourseEvidence(evaluations),
    ...buildQualitativeSummary(qualitativeItems),
  };
}

type QualitativeRow = {
  text_content: string;
  response_id: string;
  response: { assignment: { course_bound_id: string | null } };
};

function buildQualitativeSummary(
  qualitativeItems: QualitativeRow[]
): Pick<
  FacultyDashboardVisualizations,
  | "qualitativeItemCount"
  | "qualitativeResponseCount"
  | "qualitativeEvaluationCount"
  | "wordCloudTokens"
> {
  const texts = qualitativeItems
    .map((item) => item.text_content)
    .filter((text) => text.trim().length > 0);
  const responseIds = new Set(qualitativeItems.map((item) => item.response_id));
  const evaluationIds = new Set(
    qualitativeItems
      .map((item) => item.response.assignment.course_bound_id)
      .filter((id): id is string => Boolean(id))
  );

  const qualitativeResponseCount = responseIds.size;
  return {
    qualitativeItemCount: texts.length,
    qualitativeResponseCount,
    qualitativeEvaluationCount: evaluationIds.size,
    wordCloudTokens:
      qualitativeResponseCount >= MINIMUM_ANONYMIZED_RESPONSE_COUNT
        ? buildRedactedWordCloudTokens(texts)
        : [],
  };
}

// Course evidence aggregation collects per-course rating entries, groups by scale, and
// sorts by mean; each course/scale group is a self-contained projection that splitting would
// distribute across three modules without improving testability.
// fallow-ignore-next-line complexity
function buildCourseEvidence(
  evaluations: Array<{
    id: string;
    instrument: { structure_snapshot: unknown };
    course_assignment: { course: { id: string; code: string; title: string } };
    assignments: Array<{
      response: {
        id: string;
        quant_items: Array<{ rating_value: number; section_key: string; item_key: string }>;
      } | null;
    }>;
  }>
): FacultyCourseEvidence[] {
  const courseEntries = new Map<
    string,
    {
      courseId: string;
      courseCode: string;
      courseTitle: string;
      entries: RatingEntry[];
    }
  >();
  for (const evaluation of evaluations) {
    const course = evaluation.course_assignment.course;
    const current = courseEntries.get(course.id) ?? {
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      entries: [],
    };
    for (const assignment of evaluation.assignments) {
      if (!assignment.response) continue;
      for (const item of assignment.response.quant_items) {
        current.entries.push({
          value: item.rating_value,
          responseId: assignment.response.id,
          scale: resolveItemScaleIdentity(
            evaluation.instrument.structure_snapshot,
            item.section_key,
            item.item_key
          ),
        });
      }
    }
    courseEntries.set(course.id, current);
  }

  const courseEvidence: FacultyCourseEvidence[] = [];
  for (const course of courseEntries.values()) {
    const resolvedEntries = course.entries.filter((entry) => entry.scale !== null);
    const groups = groupRatingsByScale(
      resolvedEntries.map((entry) => ({
        rating: { value: entry.value, responseId: entry.responseId },
        scale: entry.scale,
      }))
    );
    for (const group of groups) {
      if (
        group.metric.mean === null ||
        group.metric.responseCount < MINIMUM_ANONYMIZED_RESPONSE_COUNT
      )
        continue;
      courseEvidence.push({
        courseId: course.courseId,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        evidenceHref: `/faculty/analytics?courseId=${encodeURIComponent(course.courseId)}`,
        scaleLabel: group.scale ? describeScale(group.scale.descriptors) : "Scale unavailable",
        scaleMin: group.scale?.min ?? null,
        scaleMax: group.scale?.max ?? null,
        mean: roundToTwo(group.metric.mean),
        ratingCount: group.metric.ratingCount,
        responseCount: group.metric.responseCount,
        distribution: group.metric.distribution,
      });
    }
  }
  return courseEvidence.sort(
    (left, right) => left.mean - right.mean || left.courseCode.localeCompare(right.courseCode)
  );
}

export async function getFacultyDashboardMetrics(
  userId: string
): Promise<FacultyDashboardMetrics | null> {
  const scope = await authorizeFacultyDashboard(userId);
  if (!scope) return null;
  const activePeriod = await readActivePeriod();
  return readFacultyDashboardMetrics(scope, activePeriod);
}

export async function getFacultyDashboardVisualizations(
  userId: string
): Promise<FacultyDashboardVisualizations | null> {
  const scope = await authorizeFacultyDashboard(userId);
  if (!scope) return null;
  const activePeriod = await readActivePeriod();
  return readFacultyDashboardVisualizations(scope, activePeriod);
}

export async function getFacultyDashboard(userId: string): Promise<FacultyDashboardData | null> {
  const scope = await authorizeFacultyDashboard(userId);
  if (!scope) return null;
  const activePeriod = await readActivePeriod();
  const [metrics, visualizations] = await Promise.all([
    readFacultyDashboardMetrics(scope, activePeriod),
    readFacultyDashboardVisualizations(scope, activePeriod),
  ]);
  return { ...metrics, ...visualizations };
}
