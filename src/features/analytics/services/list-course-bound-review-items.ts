import { prisma } from "@/lib/db/prisma";
import { resolveReviewerProgramScope } from "@/features/academic-structure/services/resolve-reviewer-program-scope";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { CourseBoundReviewListItem } from "../types";
import { buildReviewerEvaluationScope, mean, pickReviewerRole } from "./shared";

export async function listCourseBoundReviewItems(
  programId?: string
): Promise<CourseBoundReviewListItem[]> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return [];
  }

  const reviewerRole = pickReviewerRole(authSession.activeRole);

  if (!reviewerRole) {
    return [];
  }

  if (reviewerRole === "PROGRAM_HEAD") {
    if (!programId || !(await resolveProgramHeadContext(programId)).success) {
      return [];
    }
  }

  const programScope = await resolveReviewerProgramScope({
    ...(reviewerRole === "PROGRAM_HEAD" && programId ? { programId } : {}),
    reviewerId: authSession.userId,
    reviewerRole,
  });

  if (Array.isArray(programScope) && programScope.length === 0) {
    return [];
  }

  const evaluations = await prisma.courseBoundEvaluation.findMany({
    where: {
      ...buildReviewerEvaluationScope({
        programScope,
        reviewerId: authSession.userId,
        reviewerRole,
      }),
      assignments: {
        some: {
          response: {
            is: {
              status: "SUBMITTED",
            },
          },
        },
      },
    },
    include: {
      assignments: {
        where: {
          response: {
            is: {
              status: "SUBMITTED",
            },
          },
        },
        include: {
          response: {
            include: {
              quant_items: true,
            },
          },
        },
      },
      course_assignment: {
        include: {
          course: {
            include: {
              major: true,
            },
          },
          program: true,
        },
      },
      instrument: {
        include: {
          template: true,
        },
      },
      term_instance: {
        include: {
          school_year: true,
        },
      },
    },
    orderBy: {
      published_at: "desc",
    },
  });

  return evaluations.map((evaluation) => {
    const submittedResponses = evaluation.assignments
      .map((assignment) => assignment.response)
      .filter((response) => Boolean(response));
    const quantRatings = submittedResponses.flatMap((response) =>
      response!.quant_items.map((item) => item.rating_value)
    );

    const ti = evaluation.term_instance;
    const termInstanceLabel = formatTermInstanceLabel(ti.school_year.code, ti.semester, ti.term);

    const ca = evaluation.course_assignment;

    return {
      termInstanceLabel,
      courseTitle: ca.course.title,
      deadlineAt: evaluation.deadline_at,
      evaluationId: evaluation.id,
      evaluationTitle: evaluation.deployment_name ?? evaluation.instrument.template.name,
      overallMean: mean(quantRatings),
      programLabel: ca.course.major?.name ?? ca.program.name,
      responseCount: submittedResponses.length,
      reviewerRole,
    };
  });
}
