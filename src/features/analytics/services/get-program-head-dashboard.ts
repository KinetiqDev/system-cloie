import { DeploymentStatus, ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { countEligibleCourseBoundEvaluationAssignments } from "@/features/course-assignments/services/course-assignment-roster";
import { buildReviewWordCloudTokens } from "./get-course-bound-review-detail";
import { buildProgramHeadOverviewKpi } from "./program-head-analytics-aggregators";
import type { ProgramHeadOverviewKPI } from "../program-head-analytics-types";
import type { WordCloudToken } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StakeholderMeanItem = {
  stakeholder: string;
  label: string;
  /** Full-precision mean rating; rounded only at presentation. */
  mean: number;
  responseCount: number;
};

/**
 * Dashboard KPI projection. The submitted/opportunity/rating/mean fields share
 * the Analytics Overview semantics via `buildProgramHeadOverviewKpi`; the
 * operational fields are current-state values unique to the compact surface.
 */
export type ProgramHeadDashboardKPI = ProgramHeadOverviewKPI & {
  activeDeployments: number;
  pendingResponses: number;
};

export type ProgramHeadDashboardData = {
  programLabel: string;
  programCode: string;
  kpi: ProgramHeadDashboardKPI;
  stakeholderMeans: StakeholderMeanItem[];
  wordCloudTokens: WordCloudToken[];
  qualitativeItemCount: number;
};

type ProgramHeadDashboardScope = {
  programId: string;
  programCode: string;
  programLabel: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAKEHOLDER_LABELS: Record<string, string> = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry Partners",
};

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getProgramHeadDashboard(
  programId: string
): Promise<ProgramHeadDashboardData | null> {
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    return null;
  }

  return getProgramHeadDashboardForScope({
    programId: contextResult.data.selectedProgram.id,
    programCode: contextResult.data.selectedProgram.code,
    programLabel: contextResult.data.selectedProgram.name,
  });
}

/**
 * Reads dashboard data after the caller has validated the active assignment.
 * Keep authorization in getProgramHeadDashboard for independently reachable callers.
 */
async function getProgramHeadDashboardForScope(
  scope: ProgramHeadDashboardScope
): Promise<ProgramHeadDashboardData> {
  const { programId, programCode, programLabel } = scope;

  // ── KPI Queries ──────────────────────────────────────────────────────────

  // Responses tied to this program via central deployments OR course-bound
  // evaluations, following the same scope predicate as the analytics service.
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

  // Every in-scope EvaluationAssignment is an evaluation opportunity,
  // matching the Analytics denominator regardless of response status.
  const programOpportunityScope = {
    OR: [
      {
        central_deployment: { program_id: programId },
      },
      {
        course_bound: {
          course_assignment: { program_id: programId },
        },
      },
    ],
  };

  const [
    centralDeploymentCount,
    courseBoundEvalCount,
    submittedResponseCount,
    evaluationOpportunityCount,
    ratingAggregate,
    centralPendingAssignments,
    courseBoundPendingAssignments,
  ] = await Promise.all([
    // 1. Active deployments (central + course-bound)
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
    // 2. Submitted responses (shared Analytics semantics)
    prisma.response.count({
      where: {
        status: ResponseStatus.SUBMITTED,
        ...programResponseScope,
      },
    }),
    // 3. Evaluation opportunities (shared Analytics semantics)
    prisma.evaluationAssignment.count({
      where: programOpportunityScope,
    }),
    // 4. Rating count + full-precision mean (shared Analytics semantics)
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
    // 5. Operational pending responses (current-state, not the historical denominator)
    prisma.evaluationAssignment.count({
      where: {
        OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }],
        central_deployment: {
          program_id: programId,
          status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
          OR: [{ activation_at: null }, { activation_at: { lte: new Date() } }],
          AND: [{ OR: [{ deadline_at: null }, { deadline_at: { gte: new Date() } }] }],
        },
      },
    }),
    countEligibleCourseBoundEvaluationAssignments({
      AND: [
        { OR: [{ response: null }, { response: { status: ResponseStatus.IN_PROGRESS } }] },
        {
          course_bound: {
            course_assignment: { program_id: programId },
            status: { in: [DeploymentStatus.ACTIVE, DeploymentStatus.SCHEDULED] },
            OR: [{ activation_at: null }, { activation_at: { lte: new Date() } }],
            AND: [{ OR: [{ deadline_at: null }, { deadline_at: { gte: new Date() } }] }],
          },
        },
      ],
    }),
  ]);

  const activeDeployments = centralDeploymentCount + courseBoundEvalCount;

  const kpi: ProgramHeadDashboardKPI = {
    ...buildProgramHeadOverviewKpi({
      submittedResponseCount,
      evaluationOpportunityCount,
      ratingCount: ratingAggregate._count.rating_value,
      ratingSum: ratingAggregate._sum.rating_value ?? 0,
    }),
    activeDeployments,
    pendingResponses: centralPendingAssignments + courseBoundPendingAssignments,
  };

  // ── Comparison: Mean Rating per stakeholder type ─────────────────────────

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
        mean: data.totalRating / data.ratingCount,
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
    programLabel,
    programCode,
    kpi,
    stakeholderMeans,
    qualitativeItemCount: texts.length,
    wordCloudTokens,
  };
}
