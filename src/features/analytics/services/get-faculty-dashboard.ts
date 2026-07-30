import { DeploymentStatus, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { countEligibleCourseBoundEvaluationAssignments } from "@/features/course-assignments/services/course-assignment-roster";
import { ROLES } from "@/lib/constants/roles";
import { buildReviewWordCloudTokens } from "./get-course-bound-review-detail";
import type { WordCloudToken } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CourseMeanItem = {
  courseCode: string;
  courseTitle: string;
  mean: number;
  responseCount: number;
};

export type FacultyDashboardKPI = {
  activeEvaluations: number;
  totalResponses: number;
  overallMean: number | null;
  pendingResponses: number;
};

export type FacultyDashboardData = {
  programLabel: string;
  programCode: string;
  kpi: FacultyDashboardKPI;
  courseMeans: CourseMeanItem[];
  wordCloudTokens: WordCloudToken[];
};

export type FacultyDashboardMetrics = Pick<
  FacultyDashboardData,
  "programLabel" | "programCode" | "kpi"
>;

export type FacultyDashboardVisualizations = Pick<
  FacultyDashboardData,
  "courseMeans" | "wordCloudTokens"
>;

type AuthorizedFacultyScope = {
  userId: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

function prepareFacultyWordCloudTokens(tokens: WordCloudToken[]): WordCloudToken[] {
  return tokens
    .filter(
      (token) =>
        /^[a-z][a-z-]*$/.test(token.text) &&
        Number.isFinite(token.value) &&
        token.value > 0
    )
    .map(({ text, value }) => ({ text, value }));
}

function redactPotentialIdentifiers(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b[A-Za-z]*\d[A-Za-z\d-]*\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

async function authorizeFacultyDashboard(userId: string): Promise<AuthorizedFacultyScope | null> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY || session.userId !== userId) {
    return null;
  }

  return { userId };
}

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

async function readFacultyDashboardMetrics(
  scope: AuthorizedFacultyScope
): Promise<FacultyDashboardMetrics> {
  const now = new Date();

  const [affiliation, activeEvaluations, totalResponses, pendingResponses, overallMeanResult] =
    await Promise.all([
      prisma.facultyProgramAffiliation.findFirst({
        where: { faculty_id: scope.userId, is_active: true },
        include: { program: { select: { code: true, name: true } } },
      }),
      prisma.courseBoundEvaluation.count({
        where: {
          course_assignment: { faculty_id: scope.userId },
          status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
        },
      }),
      prisma.response.count({
        where: {
          status: ResponseStatus.SUBMITTED,
          deployment_type: "COURSE_BOUND",
          assignment: {
            course_bound: {
              course_assignment: { faculty_id: scope.userId },
            },
          },
        },
      }),
      countEligibleCourseBoundEvaluationAssignments({
        AND: [
          { OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }] },
          {
            course_bound: {
              course_assignment: { faculty_id: scope.userId },
              status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
              OR: [{ activation_at: null }, { activation_at: { lte: now } }],
              AND: [{ OR: [{ deadline_at: null }, { deadline_at: { gte: now } }] }],
            },
          },
        ],
      }),
      prisma.quantitativeResponseItem.aggregate({
        _avg: { rating_value: true },
        where: {
          response: {
            status: ResponseStatus.SUBMITTED,
            deployment_type: "COURSE_BOUND",
            assignment: {
              course_bound: {
                course_assignment: { faculty_id: scope.userId },
              },
            },
          },
        },
      }),
    ]);

  const overallMean = overallMeanResult._avg?.rating_value
    ? roundToTwo(overallMeanResult._avg.rating_value)
    : null;

  return {
    programLabel: affiliation?.program.name ?? "No Program",
    programCode: affiliation?.program.code ?? "—",
    kpi: {
      activeEvaluations,
      totalResponses,
      overallMean,
      pendingResponses,
    },
  };
}

async function readFacultyDashboardVisualizations(
  scope: AuthorizedFacultyScope
): Promise<FacultyDashboardVisualizations> {
  const [evaluationsWithResponses, qualResponses] = await Promise.all([
    prisma.courseBoundEvaluation.findMany({
      where: {
        course_assignment: { faculty_id: scope.userId },
        status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.CLOSED] },
      },
      select: {
        course_assignment: {
          select: {
            course: { select: { code: true, title: true } },
          },
        },
        assignments: {
          where: {
            response: { status: ResponseStatus.SUBMITTED },
          },
          select: {
            response: {
              select: {
                quant_items: { select: { rating_value: true } },
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
              course_assignment: { faculty_id: scope.userId },
            },
          },
        },
      },
      select: { text_content: true },
    }),
  ]);

  const courseMap = new Map<
    string,
    {
      courseTitle: string;
      totalRating: number;
      ratingCount: number;
      responseCount: number;
    }
  >();

  for (const evaluation of evaluationsWithResponses) {
    const key = evaluation.course_assignment.course.code;
    const existing = courseMap.get(key) ?? {
      courseTitle: evaluation.course_assignment.course.title,
      totalRating: 0,
      ratingCount: 0,
      responseCount: 0,
    };

    for (const assignment of evaluation.assignments) {
      if (!assignment.response) continue;
      existing.responseCount++;
      for (const item of assignment.response.quant_items) {
        existing.totalRating += item.rating_value;
        existing.ratingCount++;
      }
    }

    courseMap.set(key, existing);
  }

  const courseMeans: CourseMeanItem[] = [];
  for (const [courseCode, data] of courseMap) {
    if (data.ratingCount > 0) {
      courseMeans.push({
        courseCode,
        courseTitle: data.courseTitle,
        mean: roundToTwo(data.totalRating / data.ratingCount),
        responseCount: data.responseCount,
      });
    }
  }

  const texts = qualResponses
    .map((response) => response.text_content)
    .map(redactPotentialIdentifiers)
    .filter((text) => text.trim().length > 0);

  return {
    courseMeans,
    wordCloudTokens: prepareFacultyWordCloudTokens(buildReviewWordCloudTokens(texts)),
  };
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function getFacultyDashboardMetrics(
  userId: string
): Promise<FacultyDashboardMetrics | null> {
  const scope = await authorizeFacultyDashboard(userId);
  return scope ? readFacultyDashboardMetrics(scope) : null;
}

export async function getFacultyDashboardVisualizations(
  userId: string
): Promise<FacultyDashboardVisualizations | null> {
  const scope = await authorizeFacultyDashboard(userId);
  return scope ? readFacultyDashboardVisualizations(scope) : null;
}

export async function getFacultyDashboard(userId: string): Promise<FacultyDashboardData | null> {
  const scope = await authorizeFacultyDashboard(userId);

  if (!scope) {
    return null;
  }

  const [metrics, visualizations] = await Promise.all([
    readFacultyDashboardMetrics(scope),
    readFacultyDashboardVisualizations(scope),
  ]);

  return {
    ...metrics,
    ...visualizations,
  };
}
