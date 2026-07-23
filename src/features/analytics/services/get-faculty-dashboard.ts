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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getFacultyDashboard(userId: string): Promise<FacultyDashboardData | null> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY || session.userId !== userId) {
    return null;
  }

  // Resolve faculty's program affiliation
  const affiliation = await prisma.facultyProgramAffiliation.findFirst({
    where: { faculty_id: userId, is_active: true },
    include: { program: { select: { code: true, name: true } } },
  });

  const programLabel = affiliation?.program.name ?? "No Program";
  const programCode = affiliation?.program.code ?? "—";

  // ── KPI Queries ──────────────────────────────────────────────────────────

  // 1. Active evaluations published by this faculty
  const activeEvaluations = await prisma.courseBoundEvaluation.count({
    where: {
      course_assignment: { faculty_id: userId },
      status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
    },
  });

  // 2. Total submitted responses to this faculty's evaluations
  const totalResponses = await prisma.response.count({
    where: {
      status: ResponseStatus.SUBMITTED,
      deployment_type: "COURSE_BOUND",
      assignment: {
        course_bound: {
          course_assignment: { faculty_id: userId },
        },
      },
    },
  });

  // 3. Pending responses (assigned but not submitted)
  const pendingResponses = await countEligibleCourseBoundEvaluationAssignments({
    AND: [
      { OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }] },
      {
        course_bound: {
          course_assignment: { faculty_id: userId },
          status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
          OR: [{ activation_at: null }, { activation_at: { lte: new Date() } }],
          AND: [{ OR: [{ deadline_at: null }, { deadline_at: { gte: new Date() } }] }],
        },
      },
    ],
  });

  // 4. Overall quantitative mean
  const overallMeanResult = await prisma.quantitativeResponseItem.aggregate({
    _avg: { rating_value: true },
    where: {
      response: {
        status: ResponseStatus.SUBMITTED,
        deployment_type: "COURSE_BOUND",
        assignment: {
          course_bound: {
            course_assignment: { faculty_id: userId },
          },
        },
      },
    },
  });
  const overallMean = overallMeanResult._avg?.rating_value
    ? roundToTwo(overallMeanResult._avg.rating_value)
    : null;

  // ── Pie Chart: Mean per course ───────────────────────────────────────────

  const evaluationsWithResponses = await prisma.courseBoundEvaluation.findMany({
    where: {
      course_assignment: { faculty_id: userId },
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
  });

  // Aggregate by course
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

  // ── Word Cloud: Qualitative responses ────────────────────────────────────

  const qualResponses = await prisma.qualitativeResponseItem.findMany({
    where: {
      response: {
        status: ResponseStatus.SUBMITTED,
        deployment_type: "COURSE_BOUND",
        assignment: {
          course_bound: {
            course_assignment: { faculty_id: userId },
          },
        },
      },
    },
    select: { text_content: true },
  });

  const texts = qualResponses.map((r) => r.text_content).filter((t) => t.trim().length > 0);

  const wordCloudTokens = buildReviewWordCloudTokens(texts);

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    programLabel,
    programCode,
    kpi: {
      activeEvaluations,
      totalResponses,
      overallMean,
      pendingResponses,
    },
    courseMeans,
    wordCloudTokens,
  };
}
