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
import type { ScaleCategoryCount } from "../aggregators/types";
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
  const periodWhere = activePeriod
    ? { term_instance_id: activePeriod.id }
    : { id: "__no_active_period__" };
  const evaluationWhere = {
    course_assignment: { faculty_id: scope.userId },
    ...periodWhere,
  };
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
  const submittedResponses = evaluations.flatMap((evaluation) =>
    evaluation.assignments.flatMap((assignment) =>
      assignment.response?.status === ResponseStatus.SUBMITTED ? [assignment.response] : []
    )
  );
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
  const resolvedRatingEntries = ratingEntries.filter((entry) => entry.scale !== null);
  const scaleGroups = groupRatingsByScale(
    resolvedRatingEntries.map((entry) => ({
      rating: { value: entry.value, responseId: entry.responseId },
      scale: entry.scale,
    }))
  );
  const distinctRatedResponses = new Set(resolvedRatingEntries.map((entry) => entry.responseId))
    .size;
  const singleMetric =
    scaleGroups.length === 1 && distinctRatedResponses >= MINIMUM_ANONYMIZED_RESPONSE_COUNT
      ? scaleGroups[0].metric
      : null;
  const assignedCount = evaluations.reduce(
    (sum, evaluation) => sum + evaluation.assignments.length,
    0
  );
  const activeEvaluations = evaluations.filter(
    (evaluation) => evaluation.status === DeploymentStatus.ACTIVE
  );

  const upcomingEvaluations = evaluations
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

  const courseOverview = courseAssignments.map((assignment) => {
    const evaluation = evaluationByAssignment.get(assignment.id);
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
      assignmentId: assignment.id,
      contextLabel: `${assignment.year_level.replaceAll("_", " ")} · ${assignment.section.replaceAll("_", " ")}`,
      courseCode: assignment.course.code,
      courseTitle: assignment.course.title,
      evaluationId: evaluation?.id ?? null,
      evaluationStatus: evaluation?.status ?? null,
      rosterCount: assignment.memberships.length,
      assignedCount: evaluation?.assignments.length ?? 0,
      submittedCount:
        evaluation?.assignments.filter(
          (evaluationAssignment) =>
            evaluationAssignment.response?.status === ResponseStatus.SUBMITTED
        ).length ?? 0,
      deadlineAt: evaluation?.deadline_at ?? null,
      mean: mayDisplayEvidence && groups.length === 1 ? groups[0].metric.mean : null,
      scaleLabel:
        mayDisplayEvidence && groups.length === 1 && groups[0].scale
          ? describeScale(groups[0].scale.descriptors)
          : null,
      spansMultipleScales: mayDisplayEvidence && groups.length > 1,
    };
  });

  return {
    programLabel: affiliation?.program.name ?? "No active program affiliation",
    programCode: affiliation?.program.code ?? "—",
    periodLabel: activePeriod?.label ?? null,
    kpi: {
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
        singleMetric && scaleGroups[0].scale
          ? describeScale(scaleGroups[0].scale.descriptors)
          : null,
      overallScaleMax: singleMetric ? (scaleGroups[0].scale?.max ?? null) : null,
      overallRatingCount: singleMetric ? resolvedRatingEntries.length : 0,
      spansMultipleScales:
        distinctRatedResponses >= MINIMUM_ANONYMIZED_RESPONSE_COUNT && scaleGroups.length > 1,
      pendingResponses,
    },
    upcomingEvaluations,
    courseOverview,
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
  courseEvidence.sort(
    (left, right) => left.mean - right.mean || left.courseCode.localeCompare(right.courseCode)
  );

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
    courseEvidence,
    qualitativeItemCount: texts.length,
    qualitativeResponseCount,
    qualitativeEvaluationCount: evaluationIds.size,
    wordCloudTokens:
      qualitativeResponseCount >= MINIMUM_ANONYMIZED_RESPONSE_COUNT
        ? buildRedactedWordCloudTokens(texts)
        : [],
  };
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
