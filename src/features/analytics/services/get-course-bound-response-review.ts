import { prisma } from "@/lib/db/prisma";
import { resolveReviewerProgramScope } from "@/features/academic-structure/services/resolve-reviewer-program-scope";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { CourseBoundResponseReview } from "../types";
import { getSnapshotSectionItems, isSnapshotSection } from "./snapshot-structure";
import {
  buildAnonymizedRespondentLabel,
  buildReviewerEvaluationScope,
  mean,
  pickReviewerRole,
} from "./shared";

export async function getCourseBoundResponseReview(
  responseId: string,
  programId?: string
): Promise<CourseBoundResponseReview | null> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return null;
  }

  const reviewerRole = pickReviewerRole(authSession.activeRole);

  if (!reviewerRole) {
    return null;
  }

  if (reviewerRole === "PROGRAM_HEAD") {
    if (!programId || !(await resolveProgramHeadContext(programId)).success) {
      return null;
    }
  }

  const programScope = await resolveReviewerProgramScope({
    ...(reviewerRole === "PROGRAM_HEAD" && programId ? { programId } : {}),
    reviewerId: authSession.userId,
    reviewerRole,
  });

  if (Array.isArray(programScope) && programScope.length === 0) {
    return null;
  }

  const response = await prisma.response.findFirst({
    where: {
      id: responseId,
      status: "SUBMITTED",
      assignment: {
        course_bound: {
          ...buildReviewerEvaluationScope({
            programScope,
            reviewerId: authSession.userId,
            reviewerRole,
          }),
        },
      },
    },
    include: {
      assignment: {
        include: {
          course_bound: {
            include: {
              course_assignment: {
                include: {
                  course: {
                    include: {
                      major: true,
                    },
                  },
                  program: true,
                  term_instance: {
                    include: {
                      school_year: true,
                    },
                  },
                },
              },
              instrument: {
                include: {
                  template: true,
                },
              },
            },
          },
        },
      },
      qual_items: true,
      quant_items: true,
    },
  });

  if (!response?.assignment.course_bound || !response.submitted_at) {
    return null;
  }

  const evaluation = response.assignment.course_bound;
  const ca = evaluation.course_assignment;

  const sections = (
    Array.isArray(evaluation.instrument.structure_snapshot)
      ? evaluation.instrument.structure_snapshot
      : []
  )
    .filter(isSnapshotSection)
    .map((section) => {
      const items = getSnapshotSectionItems(section);
      const quantitativeItems = items.filter((item) => item.kind === "quantitative");
      const qualitativeItems = items.filter((item) => item.kind === "qualitative");

      const quantitativeResponses = quantitativeItems
        .map((item) => {
          const entry = response.quant_items.find(
            (candidate) => candidate.section_key === section.key && candidate.item_key === item.key
          );

          if (!entry) {
            return null;
          }

          return {
            itemKey: item.key,
            prompt: item.prompt,
            rating: entry.rating_value,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      const qualitativeResponses = qualitativeItems
        .map((item) => {
          const entry = response.qual_items.find(
            (candidate) =>
              candidate.section_key === section.key && candidate.prompt_key === item.key
          );

          if (!entry || entry.text_content.trim().length === 0) {
            return null;
          }

          return {
            prompt: item.prompt,
            promptKey: item.key,
            text: entry.text_content,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      return {
        id: section.key,
        mean: mean(quantitativeResponses.map((item) => item.rating)),
        name: section.title,
        qualitativeResponses,
        quantitativeResponses,
      };
    });

  const ti = ca.term_instance;
  const termLabel = ti.term ? `${ti.term}` : "";
  const termInstanceLabel = termLabel
    ? `${ti.school_year.code} — ${ti.semester} — ${termLabel}`
    : `${ti.school_year.code} — ${ti.semester}`;

  return {
    termInstanceLabel,
    courseTitle: ca.course.title,
    evaluationId: evaluation.id,
    evaluationTitle: evaluation.deployment_name ?? evaluation.instrument.template.name,
    overallMean: mean(response.quant_items.map((item) => item.rating_value)),
    programLabel: ca.course.major?.name ?? ca.program.name,
    responseId: response.id,
    respondentLabel: buildAnonymizedRespondentLabel(response.id),
    reviewerRole,
    sections,
    submittedAt: response.submitted_at,
  };
}
