import { prisma } from "@/lib/db/prisma";
import { resolveReviewerProgramScope } from "@/features/academic-structure/services/resolve-reviewer-program-scope";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { CourseBoundReviewListItem } from "../types";
import { buildReviewerEvaluationScope, mean, pickReviewerRole } from "./shared";

export async function listCourseBoundReviewItems(): Promise<CourseBoundReviewListItem[]> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return [];
  }

  const reviewerRole = pickReviewerRole(authSession.activeRole);

  if (!reviewerRole) {
    return [];
  }

  const programScope = await resolveReviewerProgramScope({
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
    const termLabel = ti.term ? `${ti.term}` : "";
    const termInstanceLabel = termLabel
      ? `${ti.school_year.code} — ${ti.semester} — ${termLabel}`
      : `${ti.school_year.code} — ${ti.semester}`;

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
