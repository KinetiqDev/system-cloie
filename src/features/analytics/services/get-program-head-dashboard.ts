import { DeploymentStatus, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { countEligibleCourseBoundEvaluationAssignments } from "@/features/course-assignments/services/course-assignment-roster";
import { buildReviewWordCloudTokens } from "./get-course-bound-review-detail";
import type { WordCloudToken } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StakeholderMeanItem = {
  stakeholder: string;
  label: string;
  mean: number;
  responseCount: number;
};

export type ProgramHeadDashboardKPI = {
  activeDeployments: number;
  totalResponses: number;
  overallMean: number | null;
  pendingResponses: number;
};

export type ProgramHeadDashboardData = {
  programLabel: string;
  programCode: string;
  kpi: ProgramHeadDashboardKPI;
  stakeholderMeans: StakeholderMeanItem[];
  wordCloudTokens: WordCloudToken[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAKEHOLDER_LABELS: Record<string, string> = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry Partners",
};

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getProgramHeadDashboard(
  programId: string
): Promise<ProgramHeadDashboardData> {
  // Fetch program info
  const program = await prisma.program.findUniqueOrThrow({
    where: { id: programId },
    select: { code: true, name: true },
  });

  // ── KPI Queries ──────────────────────────────────────────────────────────

  // 1. Active deployments (central + course-bound)
  const [centralDeploymentCount, courseBoundEvalCount] = await Promise.all([
    prisma.centralDeployment.count({
      where: {
        program_id: programId,
        status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
      },
    }),
    prisma.courseBoundEvaluation.count({
      where: {
        course_assignment: { program_id: programId },
        status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
      },
    }),
  ]);
  const activeDeployments = centralDeploymentCount + courseBoundEvalCount;

  // 2. Total submitted responses + pending responses
  // Build the scope: responses tied to this program via central deployments OR course-bound evaluations
  const programResponseScope = {
    OR: [
      {
        deployment_type: "CENTRAL" as const,
        assignment: {
          central_deployment: { program_id: programId },
        },
      },
      {
        deployment_type: "COURSE_BOUND" as const,
        assignment: {
          course_bound: {
            course_assignment: { program_id: programId },
          },
        },
      },
    ],
  };

  const [totalResponses, centralPendingAssignments, courseBoundPendingAssignments] =
    await Promise.all([
      prisma.response.count({
        where: {
          status: ResponseStatus.SUBMITTED,
          ...programResponseScope,
        },
      }),
      prisma.evaluationAssignment.count({
        where: {
          OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }],
          central_deployment: { program_id: programId },
        },
      }),
      countEligibleCourseBoundEvaluationAssignments({
        OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }],
        course_bound: {
          course_assignment: { program_id: programId },
        },
      }),
    ]);

  // 3. Overall quantitative mean
  const overallMeanResult = await prisma.quantitativeResponseItem.aggregate({
    _avg: { rating_value: true },
    where: {
      response: {
        status: ResponseStatus.SUBMITTED,
        ...programResponseScope,
      },
    },
  });
  const overallMean = overallMeanResult._avg?.rating_value
    ? roundToTwo(overallMeanResult._avg.rating_value)
    : null;

  // ── Pie Chart: Mean per stakeholder type ─────────────────────────────────

  // Only central deployments have target_stakeholder
  const stakeholderGroups = await prisma.centralDeployment.findMany({
    where: {
      program_id: programId,
      status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.CLOSED] },
    },
    select: {
      target_stakeholder: true,
      assignments: {
        where: {
          response: {
            status: ResponseStatus.SUBMITTED,
          },
        },
        select: {
          response: {
            select: {
              quant_items: {
                select: { rating_value: true },
              },
            },
          },
        },
      },
    },
  });

  // Aggregate by stakeholder type
  const stakeholderMap = new Map<
    string,
    { totalRating: number; ratingCount: number; responseCount: number }
  >();

  for (const deployment of stakeholderGroups) {
    const key = deployment.target_stakeholder;
    const existing = stakeholderMap.get(key) ?? {
      totalRating: 0,
      ratingCount: 0,
      responseCount: 0,
    };

    for (const assignment of deployment.assignments) {
      if (!assignment.response) continue;
      existing.responseCount++;
      for (const item of assignment.response.quant_items) {
        existing.totalRating += item.rating_value;
        existing.ratingCount++;
      }
    }

    stakeholderMap.set(key, existing);
  }

  const stakeholderMeans: StakeholderMeanItem[] = [];
  for (const [stakeholder, data] of stakeholderMap) {
    if (data.ratingCount > 0) {
      stakeholderMeans.push({
        stakeholder,
        label: STAKEHOLDER_LABELS[stakeholder] ?? stakeholder,
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
        ...programResponseScope,
      },
    },
    select: { text_content: true },
  });

  const texts = qualResponses.map((r) => r.text_content).filter((t) => t.trim().length > 0);

  const wordCloudTokens = buildReviewWordCloudTokens(texts);

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    programLabel: program.name,
    programCode: program.code,
    kpi: {
      activeDeployments,
      totalResponses,
      overallMean,
      pendingResponses: centralPendingAssignments + courseBoundPendingAssignments,
    },
    stakeholderMeans,
    wordCloudTokens,
  };
}
