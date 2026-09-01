import { ResponseStatus } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import {
  ratingBelongsToScale,
  resolveItemScaleIdentity,
} from "@/features/analytics/aggregators/scale-identity";

export type GeneralEducationDashboardEvidence = {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  responseRate: number | null;
  ratingCount: number;
  meanRating: number | null;
};

/**
 * Small current-period aggregate for the Coordinator dashboard.
 * The result is request-scoped, General Education Course-bound only, and never
 * exposes response rows or respondent data to the caller.
 */
export async function getGeneralEducationDashboardEvidence(
  termInstanceId: string
): Promise<GeneralEducationDashboardEvidence | null> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.GEN_ED_COORDINATOR) return null;

  const courseAssignmentScope = {
    term_instance_id: termInstanceId,
    course: { course_scope: "GENERAL_EDUCATION" as const },
  };
  const responseScope = {
    status: ResponseStatus.SUBMITTED,
    deployment_type: "COURSE_BOUND" as const,
    assignment: { course_bound: { course_assignment: courseAssignmentScope } },
  };

  const [submittedResponseCount, evaluationOpportunityCount, ratingRows] = await Promise.all([
    prisma.response.count({ where: responseScope }),
    prisma.evaluationAssignment.count({
      where: { course_bound: { course_assignment: courseAssignmentScope } },
    }),
    prisma.quantitativeResponseItem.findMany({
      where: { response: responseScope },
      select: {
        rating_value: true,
        section_key: true,
        item_key: true,
        response: {
          select: {
            assignment: {
              select: {
                course_bound: {
                  select: {
                    instrument: { select: { structure_snapshot: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const resolvedRatings = ratingRows.flatMap((row) => {
    const snapshot = row.response.assignment.course_bound?.instrument.structure_snapshot;
    const scale = resolveItemScaleIdentity(snapshot, row.section_key, row.item_key);
    if (scale === null || !ratingBelongsToScale(scale, row.rating_value)) return [];
    return [{ value: row.rating_value, scaleKey: scale.key }];
  });
  const scaleKeys = new Set(resolvedRatings.map((rating) => rating.scaleKey));
  const ratingCount = resolvedRatings.length;
  const meanRating =
    ratingCount > 0 && scaleKeys.size === 1
      ? resolvedRatings.reduce((sum, rating) => sum + rating.value, 0) / ratingCount
      : null;

  return {
    submittedResponseCount,
    evaluationOpportunityCount,
    responseRate:
      evaluationOpportunityCount === 0 ? null : submittedResponseCount / evaluationOpportunityCount,
    ratingCount,
    meanRating,
  };
}
