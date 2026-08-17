import type { ProgramHeadOverviewKPI } from "../program-head-analytics-types";

/**
 * Build the shared Overview KPI projection used by both the selected-Program
 * Analytics Overview and the compact Program Head dashboard.
 *
 * Semantics locked by #430 and reused by the dashboard:
 * - `submittedResponseCount`: responses with `status = SUBMITTED` only.
 * - `evaluationOpportunityCount`: all in-scope `EvaluationAssignment` rows
 *   (the historical response-rate denominator).
 * - `responseRate`: submitted responses divided by eligible opportunities;
 *   `null` when there are no opportunities (never a fabricated 0%).
 * - `ratingCount`: valid quantitative items, distinct from response count.
 * - `meanRating`: sum of valid rating values divided by rating count,
 *   retained at full precision; `null` when there are no ratings.
 *
 * Pure aggregation helper: no Prisma access, so the deterministic formulas
 * stay unit-testable and identical across surfaces.
 */
export function buildProgramHeadOverviewKpi(input: {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  ratingCount: number;
  ratingSum: number;
}): ProgramHeadOverviewKPI {
  const { submittedResponseCount, evaluationOpportunityCount, ratingCount, ratingSum } = input;

  return {
    submittedResponseCount,
    evaluationOpportunityCount,
    responseRate:
      evaluationOpportunityCount === 0
        ? null
        : submittedResponseCount / evaluationOpportunityCount,
    ratingCount,
    meanRating: ratingCount === 0 ? null : ratingSum / ratingCount,
  };
}
